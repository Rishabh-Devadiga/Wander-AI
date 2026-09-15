"""Trip-centric operations: accommodation and transport dispatch.

Business rules (status derivation, lifecycle transitions, overlap and
existence validation) live here so every route enforces them. The frontend
never decides statuses or validity on its own.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from backend.models.models import (
    AccommodationAssignment,
    Activity,
    ActivityAssignment,
    Destination,
    Driver,
    Hotel,
    Notification,
    TransportAssignment,
    Trip,
    TripApproval,
    TripApproval,
    TripMessage,
    User,
    Vehicle,
    Vendor,
)

logger = logging.getLogger(__name__)


class OpsNotFound(LookupError):
    """Referenced trip, property, vehicle, driver, or assignment is missing."""


class OpsValidation(ValueError):
    """Request shape or business-rule violation (mapped to HTTP 422)."""


class OpsConflict(ValueError):
    """Conflicting assignment (mapped to HTTP 409)."""


class OpsForbidden(PermissionError):
    """Ownership/authorization failure (mapped to HTTP 403)."""


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _require_trip_id(trip_id: Any) -> str:
    cleaned = str(trip_id or "").strip()
    if not cleaned:
        raise OpsValidation("trip_id is required")
    if len(cleaned) > 255:
        raise OpsValidation("trip_id is too long")
    return cleaned


def _parse_dt(value: Any, field: str) -> Optional[datetime]:
    if value is None or (isinstance(value, str) and not value.strip()):
        return None
    if isinstance(value, datetime):
        return value
    text = str(value).strip()
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError as exc:
        raise OpsValidation(f"{field} must be ISO-8601 datetime") from exc


def _check_date(value: Any, field: str) -> Optional[str]:
    if value is None or (isinstance(value, str) and not value.strip()):
        return None
    text = str(value).strip()
    try:
        datetime.strptime(text, "%Y-%m-%d")
    except ValueError as exc:
        raise OpsValidation(f"{field} must use YYYY-MM-DD format") from exc
    return text


def _validate_date_range(check_in: Optional[str], check_out: Optional[str]) -> None:
    if check_in and check_out and check_out < check_in:
        raise OpsValidation("check_out_date must be on or after check_in_date")


# ---------------------------------------------------------------------------
# Accommodation
# ---------------------------------------------------------------------------

def derive_accommodation_status(
    hotel: Optional[Hotel], rooms: Optional[int]
) -> tuple[str, Optional[str]]:
    """Backend status rules: no hotel -> pending; complete -> assigned; else issue."""
    if hotel is None:
        return "pending", None
    if not hotel.is_active:
        return "issue", "Assigned property is inactive"
    if rooms is None or rooms < 1:
        return "issue", "Room allocation is required"
    return "assigned", None


def _get_hotel(db: Session, hotel_id: Any) -> Hotel:
    hotel = db.query(Hotel).filter(Hotel.id == str(hotel_id or "").strip()).first()
    if not hotel:
        raise OpsNotFound("Property not found")
    return hotel


def _assignment_dict(row: AccommodationAssignment) -> Dict[str, Any]:
    hotel = row.hotel
    return {
        "id": row.id,
        "trip_id": row.trip_id,
        "hotel_id": row.hotel_id,
        "hotel": (
            {
                "id": hotel.id,
                "name": hotel.name,
                "address": hotel.address,
                "rating": hotel.rating,
                "category": hotel.category,
                "price_per_night": hotel.price_per_night,
                "currency": hotel.currency,
                "is_active": hotel.is_active,
                "destination_id": hotel.destination_id,
            }
            if hotel
            else None
        ),
        "rooms": row.rooms,
        "room_type": row.room_type,
        "check_in_date": row.check_in_date,
        "check_out_date": row.check_out_date,
        "status": row.status,
        "issue_reason": row.issue_reason,
        "updated_by": row.updated_by,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def get_accommodation_assignment(db: Session, trip_id: str) -> Optional[Dict[str, Any]]:
    row = (
        db.query(AccommodationAssignment)
        .filter(AccommodationAssignment.trip_id == _require_trip_id(trip_id))
        .first()
    )
    return _assignment_dict(row) if row else None


def list_accommodation_assignments(
    db: Session, status: Optional[str] = None
) -> List[Dict[str, Any]]:
    query = db.query(AccommodationAssignment).order_by(AccommodationAssignment.updated_at.desc())
    if status:
        if status not in ("pending", "assigned", "issue"):
            raise OpsValidation("status must be pending, assigned, or issue")
        query = query.filter(AccommodationAssignment.status == status)
    return [_assignment_dict(row) for row in query.all()]


def create_accommodation_assignment(
    db: Session,
    trip_id: str,
    hotel_id: Optional[str] = None,
    rooms: Optional[int] = None,
    room_type: Optional[str] = None,
    check_in_date: Optional[str] = None,
    check_out_date: Optional[str] = None,
    updated_by: str = "operator",
) -> Dict[str, Any]:
    trip_id = _require_trip_id(trip_id)
    _require_unlocked(db, trip_id)
    _require_approved(db, trip_id)
    if (
        db.query(AccommodationAssignment)
        .filter(AccommodationAssignment.trip_id == trip_id)
        .first()
    ):
        raise OpsConflict("Trip already has an accommodation assignment; update it instead")
    hotel = _get_hotel(db, hotel_id) if hotel_id else None
    if rooms is not None and (not isinstance(rooms, int) or isinstance(rooms, bool) or rooms < 0):
        raise OpsValidation("rooms must be a non-negative integer")
    check_in = _check_date(check_in_date, "check_in_date")
    check_out = _check_date(check_out_date, "check_out_date")
    _validate_date_range(check_in, check_out)
    status, reason = derive_accommodation_status(hotel, rooms)
    row = AccommodationAssignment(
        trip_id=trip_id,
        hotel_id=hotel.id if hotel else None,
        rooms=rooms,
        room_type=(room_type or "").strip() or None,
        check_in_date=check_in,
        check_out_date=check_out,
        status=status,
        issue_reason=reason,
        updated_by=(updated_by or "operator")[:50],
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _assignment_dict(row)


def replace_accommodation_assignment(
    db: Session,
    trip_id: str,
    hotel_id: Optional[str] = None,
    rooms: Optional[int] = None,
    room_type: Optional[str] = None,
    check_in_date: Optional[str] = None,
    check_out_date: Optional[str] = None,
    updated_by: str = "operator",
) -> Dict[str, Any]:
    trip_id = _require_trip_id(trip_id)
    _require_unlocked(db, trip_id)
    _require_approved(db, trip_id)
    row = (
        db.query(AccommodationAssignment)
        .filter(AccommodationAssignment.trip_id == trip_id)
        .first()
    )
    if not row:
        raise OpsNotFound("Accommodation assignment not found for trip")
    hotel = _get_hotel(db, hotel_id) if hotel_id else None
    if rooms is not None and (not isinstance(rooms, int) or isinstance(rooms, bool) or rooms < 0):
        raise OpsValidation("rooms must be a non-negative integer")
    check_in = _check_date(check_in_date, "check_in_date")
    check_out = _check_date(check_out_date, "check_out_date")
    _validate_date_range(check_in, check_out)
    row.hotel_id = hotel.id if hotel else None
    row.rooms = rooms
    row.room_type = (room_type or "").strip() or None
    row.check_in_date = check_in
    row.check_out_date = check_out
    row.status, row.issue_reason = derive_accommodation_status(hotel, rooms)
    row.updated_by = (updated_by or "operator")[:50]
    db.commit()
    db.refresh(row)
    return _assignment_dict(row)


def update_room_allocation(
    db: Session,
    trip_id: str,
    rooms: Optional[int] = None,
    room_type: Optional[str] = None,
    updated_by: str = "operator",
) -> Dict[str, Any]:
    trip_id = _require_trip_id(trip_id)
    _require_unlocked(db, trip_id)
    row = (
        db.query(AccommodationAssignment)
        .filter(AccommodationAssignment.trip_id == trip_id)
        .first()
    )
    if not row:
        raise OpsNotFound("Accommodation assignment not found for trip")
    if rooms is not None and (not isinstance(rooms, int) or isinstance(rooms, bool) or rooms < 0):
        raise OpsValidation("rooms must be a non-negative integer")
    row.rooms = rooms
    if room_type is not None:
        row.room_type = room_type.strip() or None
    row.status, row.issue_reason = derive_accommodation_status(row.hotel, row.rooms)
    row.updated_by = (updated_by or "operator")[:50]
    db.commit()
    db.refresh(row)
    return _assignment_dict(row)


def flag_accommodation_issue(
    db: Session, trip_id: str, reason: str, updated_by: str = "operator"
) -> Dict[str, Any]:
    trip_id = _require_trip_id(trip_id)
    _require_unlocked(db, trip_id)
    row = (
        db.query(AccommodationAssignment)
        .filter(AccommodationAssignment.trip_id == trip_id)
        .first()
    )
    if not row:
        raise OpsNotFound("Accommodation assignment not found for trip")
    reason = (reason or "").strip()
    if not reason:
        raise OpsValidation("reason is required to flag an issue")
    row.status = "issue"
    row.issue_reason = reason[:1000]
    row.updated_by = (updated_by or "operator")[:50]
    db.commit()
    db.refresh(row)
    return _assignment_dict(row)


def resolve_accommodation_issue(db: Session, trip_id: str) -> Dict[str, Any]:
    trip_id = _require_trip_id(trip_id)
    _require_unlocked(db, trip_id)
    row = (
        db.query(AccommodationAssignment)
        .filter(AccommodationAssignment.trip_id == trip_id)
        .first()
    )
    if not row:
        raise OpsNotFound("Accommodation assignment not found for trip")
    row.status, row.issue_reason = derive_accommodation_status(row.hotel, row.rooms)
    db.commit()
    db.refresh(row)
    return _assignment_dict(row)


def list_properties(db: Session, active_only: bool = True) -> List[Dict[str, Any]]:
    query = db.query(Hotel).order_by(Hotel.rating.desc(), Hotel.name.asc())
    if active_only:
        query = query.filter(Hotel.is_active == True)  # noqa: E712
    hotels = query.all()
    assignments = db.query(AccommodationAssignment).filter(
        AccommodationAssignment.hotel_id.isnot(None)
    ).all()
    by_hotel: Dict[str, List[str]] = {}
    for row in assignments:
        by_hotel.setdefault(row.hotel_id or "", []).append(row.trip_id)
    result = []
    for hotel in hotels:
        trip_ids = sorted(set(by_hotel.get(hotel.id, [])))
        destination = db.query(Destination).filter(Destination.id == hotel.destination_id).first()
        result.append(
            {
                "id": hotel.id,
                "name": hotel.name,
                "address": hotel.address,
                "category": hotel.category,
                "rating": hotel.rating,
                "price_per_night": hotel.price_per_night,
                "currency": hotel.currency,
                "is_active": hotel.is_active,
                "destination_id": hotel.destination_id,
                "destination_name": destination.name if destination else None,
                "assigned_trip_ids": trip_ids,
                "assigned_trip_count": len(trip_ids),
            }
        )
    return result


def get_property_trips(db: Session, hotel_id: str) -> Dict[str, Any]:
    hotel = _get_hotel(db, hotel_id)
    rows = (
        db.query(AccommodationAssignment)
        .filter(AccommodationAssignment.hotel_id == hotel.id)
        .order_by(AccommodationAssignment.updated_at.desc())
        .all()
    )
    return {
        "hotel": {"id": hotel.id, "name": hotel.name, "address": hotel.address},
        "assignments": [_assignment_dict(row) for row in rows],
    }


# ---------------------------------------------------------------------------
# Fleet inventory
# ---------------------------------------------------------------------------

def _vehicle_dict(vehicle: Vehicle) -> Dict[str, Any]:
    return {
        "id": vehicle.id,
        "name": vehicle.name,
        "registration_number": vehicle.registration_number,
        "vehicle_type": vehicle.vehicle_type,
        "capacity": vehicle.capacity,
        "is_active": vehicle.is_active,
        "created_at": vehicle.created_at.isoformat() if vehicle.created_at else None,
    }


def _driver_dict(driver: Driver) -> Dict[str, Any]:
    return {
        "id": driver.id,
        "name": driver.name,
        "phone": driver.phone,
        "license_number": driver.license_number,
        "is_active": driver.is_active,
        "created_at": driver.created_at.isoformat() if driver.created_at else None,
    }


def list_vehicles(db: Session, active_only: bool = True) -> List[Dict[str, Any]]:
    query = db.query(Vehicle).order_by(Vehicle.name.asc())
    if active_only:
        query = query.filter(Vehicle.is_active == True)  # noqa: E712
    return [_vehicle_dict(v) for v in query.all()]


def create_vehicle(
    db: Session,
    name: str,
    registration_number: str,
    vehicle_type: str = "private_cab",
    capacity: int = 4,
) -> Dict[str, Any]:
    name = (name or "").strip()
    registration_number = (registration_number or "").strip()
    if not name:
        raise OpsValidation("name is required")
    if not registration_number:
        raise OpsValidation("registration_number is required")
    if (
        db.query(Vehicle)
        .filter(Vehicle.registration_number == registration_number)
        .first()
    ):
        raise OpsConflict("A vehicle with this registration number already exists")
    if not isinstance(capacity, int) or isinstance(capacity, bool) or capacity < 1:
        raise OpsValidation("capacity must be a positive integer")
    vehicle = Vehicle(
        name=name[:255],
        registration_number=registration_number[:50],
        vehicle_type=(vehicle_type or "private_cab")[:50],
        capacity=capacity,
        is_active=True,
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return _vehicle_dict(vehicle)


def list_drivers(db: Session, active_only: bool = True) -> List[Dict[str, Any]]:
    query = db.query(Driver).order_by(Driver.name.asc())
    if active_only:
        query = query.filter(Driver.is_active == True)  # noqa: E712
    return [_driver_dict(d) for d in query.all()]


def create_driver(
    db: Session,
    name: str,
    phone: Optional[str] = None,
    license_number: Optional[str] = None,
) -> Dict[str, Any]:
    name = (name or "").strip()
    if not name:
        raise OpsValidation("name is required")
    driver = Driver(
        name=name[:255],
        phone=(phone or "").strip()[:50] or None,
        license_number=(license_number or "").strip()[:100] or None,
        is_active=True,
    )
    db.add(driver)
    db.commit()
    db.refresh(driver)
    return _driver_dict(driver)


def _get_vehicle(db: Session, vehicle_id: Any) -> Vehicle:
    vehicle = db.query(Vehicle).filter(Vehicle.id == str(vehicle_id or "").strip()).first()
    if not vehicle:
        raise OpsNotFound("Vehicle not found")
    if not vehicle.is_active:
        raise OpsValidation("Vehicle is inactive")
    return vehicle


def _get_driver(db: Session, driver_id: Any) -> Driver:
    driver = db.query(Driver).filter(Driver.id == str(driver_id or "").strip()).first()
    if not driver:
        raise OpsNotFound("Driver not found")
    if not driver.is_active:
        raise OpsValidation("Driver is inactive")
    return driver


# ---------------------------------------------------------------------------
# Transport assignments
# ---------------------------------------------------------------------------

def _windows_overlap(
    a_start: Optional[datetime],
    a_end: Optional[datetime],
    b_start: Optional[datetime],
    b_end: Optional[datetime],
) -> bool:
    if not a_start or not a_end or not b_start or not b_end:
        return False
    return a_start < b_end and b_start < a_end


def _assert_no_resource_conflict(
    db: Session,
    *,
    ignore_id: Optional[str],
    vehicle_id: Optional[str],
    driver_id: Optional[str],
    pickup_at: Optional[datetime],
    dropoff_at: Optional[datetime],
) -> None:
    if not pickup_at or not dropoff_at or (not vehicle_id and not driver_id):
        return
    query = db.query(TransportAssignment).filter(
        TransportAssignment.status.in_(["assigned", "en_route", "delayed"])
    )
    if ignore_id:
        query = query.filter(TransportAssignment.id != ignore_id)
    for row in query.all():
        if vehicle_id and row.vehicle_id == vehicle_id and _windows_overlap(
            pickup_at, dropoff_at, row.pickup_at, row.dropoff_at
        ):
            raise OpsConflict(
                f"Vehicle is already committed to trip {row.trip_id} in that window"
            )
        if driver_id and row.driver_id == driver_id and _windows_overlap(
            pickup_at, dropoff_at, row.pickup_at, row.dropoff_at
        ):
            raise OpsConflict(
                f"Driver is already committed to trip {row.trip_id} in that window"
            )


def _transport_dict(row: TransportAssignment) -> Dict[str, Any]:
    return {
        "id": row.id,
        "trip_id": row.trip_id,
        "vehicle_id": row.vehicle_id,
        "vehicle": _vehicle_dict(row.vehicle) if row.vehicle else None,
        "driver_id": row.driver_id,
        "driver": _driver_dict(row.driver) if row.driver else None,
        "origin": row.origin,
        "destination": row.destination,
        "pickup_at": row.pickup_at.isoformat() if row.pickup_at else None,
        "dropoff_at": row.dropoff_at.isoformat() if row.dropoff_at else None,
        "status": row.status,
        "pre_delay_status": row.pre_delay_status,
        "delay_reason": row.delay_reason,
        "updated_by": row.updated_by,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _journey_complete(row: TransportAssignment) -> bool:
    return bool(row.vehicle_id and row.driver_id and row.pickup_at and row.dropoff_at)


def get_transport_assignment(db: Session, trip_id: str) -> Optional[Dict[str, Any]]:
    row = (
        db.query(TransportAssignment)
        .filter(TransportAssignment.trip_id == _require_trip_id(trip_id))
        .first()
    )
    return _transport_dict(row) if row else None


def list_transport_assignments(
    db: Session, status: Optional[str] = None
) -> List[Dict[str, Any]]:
    query = db.query(TransportAssignment).order_by(TransportAssignment.updated_at.desc())
    if status:
        if status not in ("pending", "assigned", "en_route", "completed", "delayed"):
            raise OpsValidation("Invalid transport status filter")
        query = query.filter(TransportAssignment.status == status)
    return [_transport_dict(row) for row in query.all()]


def create_transport_assignment(
    db: Session,
    trip_id: str,
    vehicle_id: Optional[str] = None,
    driver_id: Optional[str] = None,
    origin: Optional[str] = None,
    destination: Optional[str] = None,
    pickup_at: Any = None,
    dropoff_at: Any = None,
    updated_by: str = "operator",
) -> Dict[str, Any]:
    trip_id = _require_trip_id(trip_id)
    _require_unlocked(db, trip_id)
    _require_approved(db, trip_id)
    if (
        db.query(TransportAssignment)
        .filter(TransportAssignment.trip_id == trip_id)
        .first()
    ):
        raise OpsConflict("Trip already has a transport assignment; update it instead")
    vehicle = _get_vehicle(db, vehicle_id) if vehicle_id else None
    driver = _get_driver(db, driver_id) if driver_id else None
    pickup = _parse_dt(pickup_at, "pickup_at")
    dropoff = _parse_dt(dropoff_at, "dropoff_at")
    if pickup and dropoff and dropoff <= pickup:
        raise OpsValidation("dropoff_at must be after pickup_at")
    _assert_no_resource_conflict(
        db,
        ignore_id=None,
        vehicle_id=vehicle.id if vehicle else None,
        driver_id=driver.id if driver else None,
        pickup_at=pickup,
        dropoff_at=dropoff,
    )
    row = TransportAssignment(
        trip_id=trip_id,
        vehicle_id=vehicle.id if vehicle else None,
        driver_id=driver.id if driver else None,
        origin=(origin or "").strip()[:255] or None,
        destination=(destination or "").strip()[:255] or None,
        pickup_at=pickup,
        dropoff_at=dropoff,
        status="pending",
        updated_by=(updated_by or "operator")[:50],
    )
    if _journey_complete(row):
        row.status = "assigned"
    db.add(row)
    db.commit()
    db.refresh(row)
    return _transport_dict(row)


def replace_transport_assignment(
    db: Session,
    trip_id: str,
    vehicle_id: Optional[str] = None,
    driver_id: Optional[str] = None,
    origin: Optional[str] = None,
    destination: Optional[str] = None,
    pickup_at: Any = None,
    dropoff_at: Any = None,
    updated_by: str = "operator",
) -> Dict[str, Any]:
    trip_id = _require_trip_id(trip_id)
    _require_unlocked(db, trip_id)
    _require_approved(db, trip_id)
    row = (
        db.query(TransportAssignment)
        .filter(TransportAssignment.trip_id == trip_id)
        .first()
    )
    if not row:
        raise OpsNotFound("Transport assignment not found for trip")
    if row.status in ("completed",):
        raise OpsValidation("Completed assignments cannot be modified")
    vehicle = _get_vehicle(db, vehicle_id) if vehicle_id else None
    driver = _get_driver(db, driver_id) if driver_id else None
    pickup = _parse_dt(pickup_at, "pickup_at")
    dropoff = _parse_dt(dropoff_at, "dropoff_at")
    if pickup and dropoff and dropoff <= pickup:
        raise OpsValidation("dropoff_at must be after pickup_at")
    _assert_no_resource_conflict(
        db,
        ignore_id=row.id,
        vehicle_id=vehicle.id if vehicle else None,
        driver_id=driver.id if driver else None,
        pickup_at=pickup,
        dropoff_at=dropoff,
    )
    row.vehicle_id = vehicle.id if vehicle else None
    row.driver_id = driver.id if driver else None
    if origin is not None:
        row.origin = origin.strip()[:255] or None
    if destination is not None:
        row.destination = destination.strip()[:255] or None
    row.pickup_at = pickup
    row.dropoff_at = dropoff
    if row.status != "delayed":
        row.status = "assigned" if _journey_complete(row) else "pending"
        row.pre_delay_status = None
        row.delay_reason = None
    row.updated_by = (updated_by or "operator")[:50]
    db.commit()
    db.refresh(row)
    return _transport_dict(row)


def update_journey_timing(
    db: Session,
    trip_id: str,
    pickup_at: Any = None,
    dropoff_at: Any = None,
    origin: Optional[str] = None,
    destination: Optional[str] = None,
    updated_by: str = "operator",
) -> Dict[str, Any]:
    trip_id = _require_trip_id(trip_id)
    _require_unlocked(db, trip_id)
    row = (
        db.query(TransportAssignment)
        .filter(TransportAssignment.trip_id == trip_id)
        .first()
    )
    if not row:
        raise OpsNotFound("Transport assignment not found for trip")
    if row.status == "completed":
        raise OpsValidation("Completed assignments cannot be modified")
    pickup = _parse_dt(pickup_at, "pickup_at") if pickup_at is not None else row.pickup_at
    dropoff = _parse_dt(dropoff_at, "dropoff_at") if dropoff_at is not None else row.dropoff_at
    if pickup and dropoff and dropoff <= pickup:
        raise OpsValidation("dropoff_at must be after pickup_at")
    _assert_no_resource_conflict(
        db,
        ignore_id=row.id,
        vehicle_id=row.vehicle_id,
        driver_id=row.driver_id,
        pickup_at=pickup,
        dropoff_at=dropoff,
    )
    row.pickup_at = pickup
    row.dropoff_at = dropoff
    if origin is not None:
        row.origin = origin.strip()[:255] or None
    if destination is not None:
        row.destination = destination.strip()[:255] or None
    if row.status != "delayed":
        row.status = "assigned" if _journey_complete(row) else "pending"
    row.updated_by = (updated_by or "operator")[:50]
    db.commit()
    db.refresh(row)
    return _transport_dict(row)


_TRANSPORT_TRANSITIONS: Dict[str, List[str]] = {
    "pending": ["assigned"],
    "assigned": ["en_route", "completed", "delayed"],
    "en_route": ["completed", "delayed"],
    "delayed": ["assigned", "en_route"],
    "completed": [],
}


def transition_transport_status(
    db: Session,
    trip_id: str,
    to_status: str,
    delay_reason: Optional[str] = None,
    updated_by: str = "operator",
) -> Dict[str, Any]:
    trip_id = _require_trip_id(trip_id)
    _require_unlocked(db, trip_id)
    row = (
        db.query(TransportAssignment)
        .filter(TransportAssignment.trip_id == trip_id)
        .first()
    )
    if not row:
        raise OpsNotFound("Transport assignment not found for trip")
    to_status = (to_status or "").strip()
    if to_status not in _TRANSPORT_TRANSITIONS:
        raise OpsValidation("Invalid target status")
    if to_status not in _TRANSPORT_TRANSITIONS.get(row.status, []):
        raise OpsValidation(f"Cannot move transport from {row.status} to {to_status}")
    if to_status == "assigned" and not _journey_complete(row):
        raise OpsValidation("Vehicle, driver, pickup and drop-off are required before Assigned")
    if to_status == "delayed":
        reason = (delay_reason or "").strip()
        if not reason:
            raise OpsValidation("delay_reason is required to mark a journey delayed")
        if row.status != "delayed":
            row.pre_delay_status = row.status
        row.delay_reason = reason[:1000]
    else:
        # Leaving delayed restores a clean slate; arrival at completed clears history.
        row.pre_delay_status = None
        row.delay_reason = None
    row.status = to_status
    row.updated_by = (updated_by or "operator")[:50]
    db.commit()
    db.refresh(row)
    return _transport_dict(row)


# ---------------------------------------------------------------------------
# Operator approval pipeline (traveler-confirmed -> approved -> accepted ->
# finalized). Gates assignment attachment and locks finalized trips.
# ---------------------------------------------------------------------------

def _get_approval(db: Session, trip_id: str) -> Optional[TripApproval]:
    return (
        db.query(TripApproval)
        .filter(TripApproval.trip_id == _require_trip_id(trip_id))
        .first()
    )


def _require_approved(db: Session, trip_id: str) -> TripApproval:
    """Resource attachment requires operator approval (HTTP 409 otherwise)."""
    approval = _get_approval(db, trip_id)
    if approval is None or not approval.approved:
        raise OpsConflict("Operator approval is required before assigning resources")
    return approval


def _require_unlocked(db: Session, trip_id: str) -> Optional[TripApproval]:
    """Finalized trips reject every assignment mutation (HTTP 409)."""
    approval = _get_approval(db, trip_id)
    if approval is not None and approval.finalized:
        raise OpsConflict("Trip is finalized; assignments are locked")
    return approval


def _approval_dict(approval: Optional[TripApproval], trip_id: str) -> Dict[str, Any]:
    return {
        "trip_id": trip_id,
        "approved": bool(approval and approval.approved),
        "approved_at": approval.approved_at.isoformat() if approval and approval.approved_at else None,
        "approved_by": approval.approved_by if approval else None,
        "assignment_started": bool(approval and approval.assignment_started),
        "assignment_started_at": (
            approval.assignment_started_at.isoformat()
            if approval and approval.assignment_started_at
            else None
        ),
        "finalized": bool(approval and approval.finalized),
        "finalized_at": (
            approval.finalized_at.isoformat() if approval and approval.finalized_at else None
        ),
        "finalized_by": approval.finalized_by if approval else None,
    }


def approve_trip(db: Session, trip_id: str, updated_by: str = "operator") -> Dict[str, Any]:
    """Operator approves a traveler-confirmed trip. Idempotent."""
    from datetime import datetime as _datetime

    trip_id = _require_trip_id(trip_id)
    approval = _get_approval(db, trip_id)
    now = _datetime.utcnow()
    if approval is None:
        approval = TripApproval(
            trip_id=trip_id, approved=True, approved_at=now,
            approved_by=(updated_by or "operator")[:50],
        )
        db.add(approval)
    else:
        approval.approved = True
        if approval.approved_at is None:
            approval.approved_at = now
        approval.approved_by = (updated_by or "operator")[:50]
    db.commit()
    db.refresh(approval)
    return _approval_dict(approval, trip_id)


def accept_trip_assignment(
    db: Session, trip_id: str, updated_by: str = "operator"
) -> Dict[str, Any]:
    """Start the assignment workflow ("Accept & Assign"). Requires approval."""
    from datetime import datetime as _datetime

    trip_id = _require_trip_id(trip_id)
    approval = _require_approved(db, trip_id)
    _require_unlocked(db, trip_id)
    if not approval.assignment_started:
        approval.assignment_started = True
        approval.assignment_started_at = _datetime.utcnow()
        db.commit()
        db.refresh(approval)
    return _approval_dict(approval, trip_id)


def _service_states(db: Session, trip_id: str) -> Dict[str, Any]:
    accommodation = (
        db.query(AccommodationAssignment)
        .filter(AccommodationAssignment.trip_id == trip_id)
        .first()
    )
    transport = (
        db.query(TransportAssignment)
        .filter(TransportAssignment.trip_id == trip_id)
        .first()
    )
    activities = (
        db.query(ActivityAssignment)
        .filter(ActivityAssignment.trip_id == trip_id)
        .all()
    )
    hotel_done = bool(
        accommodation
        and accommodation.hotel_id
        and accommodation.status == "assigned"
    )
    transport_done = bool(
        transport
        and transport.vehicle_id
        and transport.driver_id
        and transport.pickup_at
        and transport.dropoff_at
        and transport.status in ("assigned", "en_route", "completed")
    )
    confirmed_activities = [a for a in activities if a.status == "confirmed"]
    return {
        "hotel": {
            "assigned": hotel_done,
            "status": accommodation.status if accommodation else "pending",
            "assignment_id": accommodation.id if accommodation else None,
        },
        "transport": {
            "assigned": transport_done,
            "status": transport.status if transport else "pending",
            "assignment_id": transport.id if transport else None,
        },
        "activities": {
            "assigned_count": len(confirmed_activities),
            "total_count": len(activities),
            "assigned": len(confirmed_activities) > 0,
        },
    }


def get_trip_pipeline(db: Session, trip_id: str) -> Dict[str, Any]:
    """Combined pipeline state for the Assignment Center (one call)."""
    trip_id = _require_trip_id(trip_id)
    approval = _get_approval(db, trip_id)
    services = _service_states(db, trip_id)
    assigned = sum(
        [services["hotel"]["assigned"], services["transport"]["assigned"], services["activities"]["assigned"]]
    )
    return {
        "trip_id": trip_id,
        "approval": _approval_dict(approval, trip_id),
        "services": services,
        "progress": {"assigned": assigned, "total": 3},
    }


def list_trip_approvals(db: Session) -> List[Dict[str, Any]]:
    rows = db.query(TripApproval).order_by(TripApproval.updated_at.desc()).all()
    return [_approval_dict(row, row.trip_id) for row in rows]


def finalize_trip(
    db: Session,
    trip_id: str,
    require_activities: bool = True,
    updated_by: str = "operator",
) -> Dict[str, Any]:
    """Finalize an approved trip: validate completeness, lock, notify.

    Blocked (422 + missing list) unless hotel and transport are complete and,
    when required, at least one activity assignment is confirmed. Creates one
    persisted traveler notification plus one persisted partner-outreach record
    per assigned vendor (the app has no email/SMS gateway; outreach contacts
    come from real vendor records).
    """
    from datetime import datetime as _datetime

    from backend.models.models import ChangeHistory as _ChangeHistory
    from backend.models.models import Notification as _Notification

    trip_id = _require_trip_id(trip_id)
    existing = _get_approval(db, trip_id)
    if existing is not None and existing.finalized:
        # Idempotent re-finalize: current summary, zero duplicate rows.
        return {
            "trip_id": trip_id,
            "finalized": True,
            "finalized_at": existing.finalized_at.isoformat() if existing.finalized_at else None,
            "services": _service_states(db, trip_id),
            "traveler_notified": False,
            "partners": [],
        }
    approval = _require_approved(db, trip_id)
    _require_unlocked(db, trip_id)
    if not approval.assignment_started:
        raise OpsValidation("Assignment workflow has not started (Accept & Assign first)")
    services = _service_states(db, trip_id)
    missing: List[str] = []
    if not services["hotel"]["assigned"]:
        missing.append("hotel")
    if not services["transport"]["assigned"]:
        missing.append("transport")
    if require_activities and not services["activities"]["assigned"]:
        missing.append("activities")
    if missing:
        raise OpsValidation(
            f"Cannot finalize: incomplete services: {', '.join(missing)}"
        )

    now = _datetime.utcnow()
    approval.finalized = True
    approval.finalized_at = now
    approval.finalized_by = (updated_by or "operator")[:50]

    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    user_id: Optional[str] = trip.user_id if trip is not None else None
    if user_id is None:
        operator = (
            db.query(User).filter(User.role == "operator", User.is_active == True).first()  # noqa: E712
            or db.query(User).filter(User.is_active == True).first()  # noqa: E712
        )
        if operator is None:
            raise OpsValidation("No users available to notify")
        user_id = operator.id

    traveler_note = _Notification(
        trip_id=trip.id if trip is not None else None,
        user_id=user_id,
        title="Trip Finalized",
        message=(
            f"Trip '{trip.title if trip else trip_id}' is finalized: hotel, "
            f"transport, and activities are assigned. Your confirmed itinerary is ready."
        ),
        type="success",
    )
    db.add(traveler_note)

    partners: List[Dict[str, Any]] = []
    seen_vendors: Dict[str, Vendor] = {}
    accommodation = (
        db.query(AccommodationAssignment)
        .filter(AccommodationAssignment.trip_id == trip_id)
        .first()
    )
    if accommodation and accommodation.hotel and accommodation.hotel.vendor:
        seen_vendors[accommodation.hotel.vendor.id] = accommodation.hotel.vendor
    transport = (
        db.query(TransportAssignment)
        .filter(TransportAssignment.trip_id == trip_id)
        .first()
    )
    for row in (
        db.query(ActivityAssignment).filter(ActivityAssignment.trip_id == trip_id).all()
    ):
        if row.vendor:
            seen_vendors[row.vendor.id] = row.vendor
    for vendor in seen_vendors.values():
        db.add(
            _Notification(
                trip_id=trip.id if trip is not None else None,
                user_id=user_id,
                title=f"Partner outreach: {vendor.name}",
                message=(
                    f"Contact {vendor.name} ({vendor.vendor_type}) for trip {trip_id}: "
                    f"{vendor.phone or 'no phone'} / {vendor.contact_email or 'no email'}."
                ),
                type="partner_notification",
            )
        )
        partners.append(
            {
                "vendor_id": vendor.id,
                "name": vendor.name,
                "vendor_type": vendor.vendor_type,
                "phone": vendor.phone,
                "contact_email": vendor.contact_email,
            }
        )

    if trip is not None:
        db.add(
            _ChangeHistory(
                trip_id=trip.id,
                changed_by="operator",
                action="trip_finalized",
                field_changed="operations",
                new_value="finalized",
                reason="Operator finalized all service assignments",
            )
        )
    db.commit()
    return {
        "trip_id": trip_id,
        "finalized": True,
        "finalized_at": now.isoformat(),
        "services": services,
        "traveler_notified": True,
        "partners": partners,
    }


# ---------------------------------------------------------------------------
# Traveler notifications (persisted backend inbox rows, never faked)
# ---------------------------------------------------------------------------
_NOTIFY_TITLES = {
    "vehicle_change": "Your vehicle has changed",
    "driver_change": "Your driver has changed",
    "timing_change": "Your pickup/drop-off time has changed",
    "route_change": "Your transport route has changed",
    "delay": "Your journey is delayed",
    "assignment": "Transport assigned to your trip",
    "accommodation_change": "Your accommodation has changed",
}


def notify_traveler(
    db: Session,
    trip_id: str,
    event: str,
    note: Optional[str] = None,
    updated_by: str = "operator",
) -> Dict[str, Any]:
    trip_id = _require_trip_id(trip_id)
    event = (event or "").strip()
    if event not in _NOTIFY_TITLES:
        raise OpsValidation(f"event must be one of {sorted(_NOTIFY_TITLES)}")
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if trip is not None:
        user_id: Optional[str] = trip.user_id
        trip_label = trip.title
    else:
        user_id = None
        trip_label = trip_id
    if user_id is None:
        operator = (
            db.query(User).filter(User.role == "operator", User.is_active == True).first()  # noqa: E712
            or db.query(User).filter(User.is_active == True).first()  # noqa: E712
        )
        if operator is None:
            raise OpsValidation("No users available to notify")
        user_id = operator.id
    facts: List[str] = []
    transport = (
        db.query(TransportAssignment).filter(TransportAssignment.trip_id == trip_id).first()
    )
    if transport is not None:
        if transport.vehicle:
            facts.append(f"Vehicle: {transport.vehicle.name} ({transport.vehicle.registration_number})")
        if transport.driver:
            facts.append(f"Driver: {transport.driver.name}")
        if transport.pickup_at:
            facts.append(f"Pickup: {transport.pickup_at.isoformat()}")
        if transport.dropoff_at:
            facts.append(f"Drop-off: {transport.dropoff_at.isoformat()}")
        if transport.status == "delayed" and transport.delay_reason:
            facts.append(f"Delay reason: {transport.delay_reason}")
    accommodation = (
        db.query(AccommodationAssignment).filter(AccommodationAssignment.trip_id == trip_id).first()
    )
    if accommodation is not None and accommodation.hotel:
        facts.append(f"Hotel: {accommodation.hotel.name}")
        if accommodation.rooms:
            facts.append(f"Rooms: {accommodation.rooms}")
    message = f"{_NOTIFY_TITLES[event]} for '{trip_label}'."
    if facts:
        message += " " + " | ".join(facts) + "."
    note = (note or "").strip()
    if note:
        message += f" Note from operations: {note[:500]}"
    row = Notification(
        trip_id=trip.id if trip is not None else None,
        user_id=user_id,
        title=_NOTIFY_TITLES[event],
        message=message,
        type="update" if event != "delay" else "warning",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "id": row.id,
        "trip_id": trip_id,
        "user_id": row.user_id,
        "title": row.title,
        "message": row.message,
        "type": row.type,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


# ---------------------------------------------------------------------------
# Activity dispatch
# ---------------------------------------------------------------------------

ELIGIBLE_VENDOR_TYPES = ("activity", "guide")


def _time_to_minutes(value: Any, field: str) -> Optional[int]:
    """Normalize HH:MM (24h) or H:MM AM/PM to minutes since midnight."""
    if value is None or (isinstance(value, str) and not value.strip()):
        return None
    text = str(value).strip()
    import re

    match = re.fullmatch(r"(\d{1,2}):(\d{2})\s*([AaPp][Mm])?", text)
    if not match:
        raise OpsValidation(f"{field} must use HH:MM format")
    hour, minute, period = int(match.group(1)), int(match.group(2)), match.group(3)
    if minute > 59:
        raise OpsValidation(f"{field} must use HH:MM format")
    if period:
        if hour < 1 or hour > 12:
            raise OpsValidation(f"{field} must use HH:MM format")
        hour = hour % 12 + (12 if period.upper() == "PM" else 0)
    elif hour > 23:
        raise OpsValidation(f"{field} must use HH:MM format")
    return hour * 60 + minute


def _minutes_to_hhmm(minutes: Optional[int]) -> Optional[str]:
    if minutes is None:
        return None
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def _get_activity(db: Session, activity_id: Any) -> Activity:
    activity = db.query(Activity).filter(Activity.id == str(activity_id or "").strip()).first()
    if not activity:
        raise OpsNotFound("Activity not found")
    if not activity.is_active:
        raise OpsValidation("Activity is inactive")
    return activity


def _get_ops_vendor(db: Session, vendor_id: Any) -> Vendor:
    vendor = db.query(Vendor).filter(Vendor.id == str(vendor_id or "").strip()).first()
    if not vendor:
        raise OpsNotFound("Vendor not found")
    if vendor.vendor_type not in ELIGIBLE_VENDOR_TYPES:
        raise OpsValidation(
            f"Vendor '{vendor.name}' does not support activities (type: {vendor.vendor_type})"
        )
    if not vendor.is_verified:
        raise OpsValidation(f"Vendor '{vendor.name}' is not verified")
    return vendor


def _check_capacity(activity: Activity, participants: Optional[int]) -> None:
    if participants is None:
        return
    if activity.capacity is not None and participants > activity.capacity:
        raise OpsConflict(
            f"Requested {participants} participants exceed available capacity "
            f"{activity.capacity} for '{activity.title}'"
        )


def _check_trip_date_range(db: Session, trip_id: str, scheduled_date: Optional[str]) -> None:
    if not scheduled_date:
        return
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if trip is None or not trip.start_date or not trip.end_date:
        return
    day = scheduled_date
    if day < trip.start_date.strftime("%Y-%m-%d") or day > trip.end_date.strftime("%Y-%m-%d"):
        raise OpsValidation(
            f"scheduled_date {day} is outside the trip window "
            f"{trip.start_date.strftime('%Y-%m-%d')} to {trip.end_date.strftime('%Y-%m-%d')}"
        )


def _ranges_overlap(
    a_start: Optional[int], a_end: Optional[int], b_start: Optional[int], b_end: Optional[int]
) -> bool:
    if a_start is None or b_start is None:
        return False
    a_end = a_end if a_end is not None else a_start + 60
    b_end = b_end if b_end is not None else b_start + 60
    return a_start < b_end and b_start < a_end


def _assert_no_activity_conflict(
    db: Session,
    *,
    ignore_id: Optional[str],
    trip_id: str,
    vendor_id: Optional[str],
    scheduled_date: Optional[str],
    start_minutes: Optional[int],
    end_minutes: Optional[int],
) -> None:
    if not scheduled_date or start_minutes is None:
        return
    query = db.query(ActivityAssignment).filter(
        ActivityAssignment.scheduled_date == scheduled_date
    )
    if ignore_id:
        query = query.filter(ActivityAssignment.id != ignore_id)
    for row in query.all():
        other_start = _time_to_minutes(row.start_time, "start_time") if row.start_time else None
        other_end = _time_to_minutes(row.end_time, "end_time") if row.end_time else None
        if row.trip_id == trip_id and _ranges_overlap(
            start_minutes, end_minutes, other_start, other_end
        ):
            raise OpsConflict(
                f"Overlaps with '{row.activity.title if row.activity else row.activity_id}' "
                f"already scheduled for trip {trip_id} on {scheduled_date}"
            )
        if vendor_id and row.vendor_id == vendor_id and _ranges_overlap(
            start_minutes, end_minutes, other_start, other_end
        ):
            raise OpsConflict(
                f"Vendor is already committed to trip {row.trip_id} on {scheduled_date} "
                f"at that time"
            )


def _activity_price(activity: Activity, participants: Optional[int]) -> Dict[str, Any]:
    unit = float(activity.price_per_person or 0)
    return {
        "unit_price": unit,
        "currency": activity.currency or "INR",
        "participants": participants,
        "total_price": round(unit * participants, 2) if participants is not None else None,
    }


def _activity_dict(row: ActivityAssignment) -> Dict[str, Any]:
    activity = row.activity
    vendor = row.vendor
    price = _activity_price(activity, row.participants) if activity else {}
    remaining = None
    if activity and activity.capacity is not None and row.participants is not None:
        remaining = activity.capacity - row.participants
    return {
        "id": row.id,
        "trip_id": row.trip_id,
        "activity_id": row.activity_id,
        "activity": (
            {
                "id": activity.id,
                "title": activity.title,
                "category": activity.category,
                "duration_hours": activity.duration_hours,
                "rating": activity.rating,
                "capacity": activity.capacity,
                "currency": activity.currency,
                "destination_id": activity.destination_id,
                "is_active": activity.is_active,
            }
            if activity
            else None
        ),
        "vendor_id": row.vendor_id,
        "vendor": (
            {
                "id": vendor.id,
                "name": vendor.name,
                "vendor_type": vendor.vendor_type,
                "phone": vendor.phone,
                "contact_email": vendor.contact_email,
                "rating": vendor.rating,
                "is_verified": vendor.is_verified,
            }
            if vendor
            else None
        ),
        "scheduled_date": row.scheduled_date,
        "start_time": row.start_time,
        "end_time": row.end_time,
        "participants": row.participants,
        "remaining_capacity": remaining,
        "price": price,
        "status": row.status,
        "issue_reason": row.issue_reason,
        "updated_by": row.updated_by,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _validate_allocation_complete(row: ActivityAssignment) -> None:
    missing = []
    if not row.vendor_id:
        missing.append("vendor")
    if not row.scheduled_date:
        missing.append("scheduled_date")
    if row.start_time is None:
        missing.append("start_time")
    if row.participants is None or row.participants < 1:
        missing.append("participants")
    if missing:
        raise OpsValidation(f"Assignment is not confirmable; missing: {', '.join(missing)}")
    vendor = row.vendor
    if vendor is None or vendor.vendor_type not in ELIGIBLE_VENDOR_TYPES or not vendor.is_verified:
        raise OpsValidation("Assigned vendor is not eligible")
    _check_capacity(row.activity, row.participants)


def list_activity_assignments(
    db: Session,
    trip_id: Optional[str] = None,
    status: Optional[str] = None,
    vendor_id: Optional[str] = None,
    scheduled_date: Optional[str] = None,
) -> List[Dict[str, Any]]:
    query = db.query(ActivityAssignment).order_by(
        ActivityAssignment.scheduled_date.asc(),
        ActivityAssignment.start_time.asc(),
        ActivityAssignment.updated_at.desc(),
    )
    if trip_id:
        query = query.filter(ActivityAssignment.trip_id == trip_id.strip())
    if status:
        if status not in ("pending", "confirmed", "issue"):
            raise OpsValidation("status must be pending, confirmed, or issue")
        query = query.filter(ActivityAssignment.status == status)
    if vendor_id:
        query = query.filter(ActivityAssignment.vendor_id == vendor_id.strip())
    if scheduled_date:
        query = query.filter(ActivityAssignment.scheduled_date == _check_date(scheduled_date, "scheduled_date"))
    return [_activity_dict(row) for row in query.all()]


def get_activity_assignment(db: Session, assignment_id: str) -> Dict[str, Any]:
    row = (
        db.query(ActivityAssignment)
        .filter(ActivityAssignment.id == str(assignment_id or "").strip())
        .first()
    )
    if not row:
        raise OpsNotFound("Activity assignment not found")
    return _activity_dict(row)


def create_activity_assignment(
    db: Session,
    trip_id: str,
    activity_id: str,
    vendor_id: Optional[str] = None,
    scheduled_date: Optional[str] = None,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    participants: Optional[int] = None,
    updated_by: str = "operator",
) -> Dict[str, Any]:
    trip_id = _require_trip_id(trip_id)
    _require_unlocked(db, trip_id)
    _require_approved(db, trip_id)
    activity = _get_activity(db, activity_id)
    vendor = _get_ops_vendor(db, vendor_id) if vendor_id else None
    if participants is not None and (
        not isinstance(participants, int) or isinstance(participants, bool) or participants < 0
    ):
        raise OpsValidation("participants must be a non-negative integer")
    _check_capacity(activity, participants)
    date = _check_date(scheduled_date, "scheduled_date")
    start = _time_to_minutes(start_time, "start_time")
    end = _time_to_minutes(end_time, "end_time")
    if start is not None and end is not None and end <= start:
        raise OpsValidation("end_time must be after start_time")
    _check_trip_date_range(db, trip_id, date)
    _assert_no_activity_conflict(
        db, ignore_id=None, trip_id=trip_id,
        vendor_id=vendor.id if vendor else None,
        scheduled_date=date, start_minutes=start, end_minutes=end,
    )
    row = ActivityAssignment(
        trip_id=trip_id,
        activity_id=activity.id,
        vendor_id=vendor.id if vendor else None,
        scheduled_date=date,
        start_time=_minutes_to_hhmm(start),
        end_time=_minutes_to_hhmm(end),
        participants=participants,
        status="pending",
        updated_by=(updated_by or "operator")[:50],
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _activity_dict(row)


def replace_activity_assignment(
    db: Session,
    assignment_id: str,
    activity_id: Optional[str] = None,
    vendor_id: Optional[str] = None,
    vendor_cleared: bool = False,
    scheduled_date: Optional[str] = None,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    participants: Optional[int] = None,
    updated_by: str = "operator",
) -> Dict[str, Any]:
    row = (
        db.query(ActivityAssignment)
        .filter(ActivityAssignment.id == str(assignment_id or "").strip())
        .first()
    )
    if not row:
        raise OpsNotFound("Activity assignment not found")
    _require_unlocked(db, row.trip_id)
    _require_approved(db, row.trip_id)
    if activity_id is not None:
        row.activity_id = _get_activity(db, activity_id).id
    if vendor_cleared:
        row.vendor_id = None
    elif vendor_id is not None:
        row.vendor_id = _get_ops_vendor(db, vendor_id).id
    # Refresh activity reference for validation below
    db.flush()
    db.refresh(row, attribute_names=["activity", "vendor"])
    if scheduled_date is not None:
        row.scheduled_date = _check_date(scheduled_date, "scheduled_date")
    if start_time is not None:
        start = _time_to_minutes(start_time, "start_time")
        row.start_time = _minutes_to_hhmm(start)
    if end_time is not None:
        end = _time_to_minutes(end_time, "end_time")
        row.end_time = _minutes_to_hhmm(end)
    start = _time_to_minutes(row.start_time, "start_time")
    end = _time_to_minutes(row.end_time, "end_time")
    if start is not None and end is not None and end <= start:
        raise OpsValidation("end_time must be after start_time")
    if participants is not None:
        if not isinstance(participants, int) or isinstance(participants, bool) or participants < 0:
            raise OpsValidation("participants must be a non-negative integer")
        row.participants = participants
    _check_capacity(row.activity, row.participants)
    _check_trip_date_range(db, row.trip_id, row.scheduled_date)
    _assert_no_activity_conflict(
        db, ignore_id=row.id, trip_id=row.trip_id, vendor_id=row.vendor_id,
        scheduled_date=row.scheduled_date, start_minutes=start, end_minutes=end,
    )
    # Stored status is preserved here; confirm/flag/resolve change it explicitly.
    row.updated_by = (updated_by or "operator")[:50]
    db.commit()
    db.refresh(row)
    return _activity_dict(row)


def update_activity_allocation(
    db: Session, assignment_id: str, participants: Optional[int], updated_by: str = "operator"
) -> Dict[str, Any]:
    row = (
        db.query(ActivityAssignment)
        .filter(ActivityAssignment.id == str(assignment_id or "").strip())
        .first()
    )
    if not row:
        raise OpsNotFound("Activity assignment not found")
    _require_unlocked(db, row.trip_id)
    if participants is not None and (
        not isinstance(participants, int) or isinstance(participants, bool) or participants < 0
    ):
        raise OpsValidation("participants must be a non-negative integer")
    if (
        participants is not None
        and row.activity
        and row.activity.capacity is not None
        and participants > row.activity.capacity
    ):
        raise OpsConflict(
            f"Requested {participants} participants exceed available capacity "
            f"{row.activity.capacity} for '{row.activity.title}'"
        )
    row.participants = participants
    row.updated_by = (updated_by or "operator")[:50]
    db.commit()
    db.refresh(row)
    return _activity_dict(row)


def confirm_activity_assignment(db: Session, assignment_id: str) -> Dict[str, Any]:
    row = (
        db.query(ActivityAssignment)
        .filter(ActivityAssignment.id == str(assignment_id or "").strip())
        .first()
    )
    if not row:
        raise OpsNotFound("Activity assignment not found")
    _require_unlocked(db, row.trip_id)
    _require_approved(db, row.trip_id)
    _validate_allocation_complete(row)
    start = _time_to_minutes(row.start_time, "start_time")
    end = _time_to_minutes(row.end_time, "end_time")
    _assert_no_activity_conflict(
        db, ignore_id=row.id, trip_id=row.trip_id, vendor_id=row.vendor_id,
        scheduled_date=row.scheduled_date, start_minutes=start, end_minutes=end,
    )
    row.status = "confirmed"
    row.issue_reason = None
    db.commit()
    db.refresh(row)
    return _activity_dict(row)


def flag_activity_issue(db: Session, assignment_id: str, reason: str) -> Dict[str, Any]:
    row = (
        db.query(ActivityAssignment)
        .filter(ActivityAssignment.id == str(assignment_id or "").strip())
        .first()
    )
    if not row:
        raise OpsNotFound("Activity assignment not found")
    _require_unlocked(db, row.trip_id)
    reason = (reason or "").strip()
    if not reason:
        raise OpsValidation("reason is required to flag an issue")
    row.status = "issue"
    row.issue_reason = reason[:1000]
    db.commit()
    db.refresh(row)
    return _activity_dict(row)


def resolve_activity_issue(db: Session, assignment_id: str) -> Dict[str, Any]:
    row = (
        db.query(ActivityAssignment)
        .filter(ActivityAssignment.id == str(assignment_id or "").strip())
        .first()
    )
    if not row:
        raise OpsNotFound("Activity assignment not found")
    _require_unlocked(db, row.trip_id)
    try:
        _validate_allocation_complete(row)
        start = _time_to_minutes(row.start_time, "start_time")
        end = _time_to_minutes(row.end_time, "end_time")
        _assert_no_activity_conflict(
            db, ignore_id=row.id, trip_id=row.trip_id, vendor_id=row.vendor_id,
            scheduled_date=row.scheduled_date, start_minutes=start, end_minutes=end,
        )
        row.status = "confirmed"
        row.issue_reason = None
    except (OpsValidation, OpsConflict):
        row.status = "pending"
        row.issue_reason = None
    db.commit()
    db.refresh(row)
    return _activity_dict(row)


def list_eligible_vendors(db: Session, activity_id: str) -> Dict[str, Any]:
    activity = _get_activity(db, activity_id)
    vendors = (
        db.query(Vendor)
        .filter(Vendor.vendor_type.in_(ELIGIBLE_VENDOR_TYPES), Vendor.is_verified == True)  # noqa: E712
        .order_by(Vendor.rating.desc(), Vendor.name.asc())
        .all()
    )
    return {
        "activity": {"id": activity.id, "title": activity.title, "capacity": activity.capacity},
        "vendors": [
            {
                "id": v.id,
                "name": v.name,
                "vendor_type": v.vendor_type,
                "phone": v.phone,
                "contact_email": v.contact_email,
                "rating": v.rating,
                "is_verified": v.is_verified,
            }
            for v in vendors
        ],
    }


def create_ops_vendor(
    db: Session,
    name: str,
    vendor_type: str = "activity",
    contact_email: Optional[str] = None,
    phone: Optional[str] = None,
) -> Dict[str, Any]:
    name = (name or "").strip()
    if not name:
        raise OpsValidation("name is required")
    vendor_type = (vendor_type or "activity").strip()
    if vendor_type not in ("activity", "guide", "hotel", "transport"):
        raise OpsValidation("vendor_type must be activity, guide, hotel, or transport")
    vendor = Vendor(
        name=name[:255],
        vendor_type=vendor_type,
        contact_email=(contact_email or "").strip()[:255] or None,
        phone=(phone or "").strip()[:50] or None,
        rating=4.5,
        is_verified=True,
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return {
        "id": vendor.id,
        "name": vendor.name,
        "vendor_type": vendor.vendor_type,
        "phone": vendor.phone,
        "contact_email": vendor.contact_email,
        "rating": vendor.rating,
        "is_verified": vendor.is_verified,
    }


def get_vendor_assignments(db: Session, vendor_id: str) -> Dict[str, Any]:
    vendor = db.query(Vendor).filter(Vendor.id == str(vendor_id or "").strip()).first()
    if not vendor:
        raise OpsNotFound("Vendor not found")
    rows = (
        db.query(ActivityAssignment)
        .filter(ActivityAssignment.vendor_id == vendor.id)
        .order_by(
            ActivityAssignment.scheduled_date.asc(),
            ActivityAssignment.start_time.asc(),
        )
        .all()
    )
    trip_ids = sorted({row.trip_id for row in rows})
    return {
        "vendor": {
            "id": vendor.id,
            "name": vendor.name,
            "vendor_type": vendor.vendor_type,
            "phone": vendor.phone,
            "contact_email": vendor.contact_email,
            "rating": vendor.rating,
            "is_verified": vendor.is_verified,
        },
        "assignments": [_activity_dict(row) for row in rows],
        "assigned_trip_ids": trip_ids,
        "assigned_trip_count": len(trip_ids),
    }


def list_ops_vendors(db: Session, vendor_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """Vendor inventory with live assignment counts (no fabricated rows)."""
    query = db.query(Vendor).order_by(Vendor.name.asc())
    if vendor_type:
        query = query.filter(Vendor.vendor_type == vendor_type.strip())
    vendors = query.all()
    rows = db.query(ActivityAssignment).filter(ActivityAssignment.vendor_id.isnot(None)).all()
    by_vendor: Dict[str, List[str]] = {}
    for row in rows:
        by_vendor.setdefault(row.vendor_id or "", []).append(row.trip_id)
    result = []
    for vendor in vendors:
        trip_ids = sorted(set(by_vendor.get(vendor.id, [])))
        result.append(
            {
                "id": vendor.id,
                "name": vendor.name,
                "vendor_type": vendor.vendor_type,
                "phone": vendor.phone,
                "contact_email": vendor.contact_email,
                "rating": vendor.rating,
                "is_verified": vendor.is_verified,
                "assigned_trip_ids": trip_ids,
                "assigned_trip_count": len(trip_ids),
            }
        )
    return result


def set_vendor_verified(db: Session, vendor_id: str, is_verified: bool) -> Dict[str, Any]:
    vendor = db.query(Vendor).filter(Vendor.id == str(vendor_id or "").strip()).first()
    if not vendor:
        raise OpsNotFound("Vendor not found")
    vendor.is_verified = bool(is_verified)
    db.commit()
    trip_ids = sorted(
        {
            row.trip_id
            for row in db.query(ActivityAssignment)
            .filter(ActivityAssignment.vendor_id == vendor.id)
            .all()
        }
    )
    db.refresh(vendor)
    return {
        "id": vendor.id,
        "name": vendor.name,
        "vendor_type": vendor.vendor_type,
        "phone": vendor.phone,
        "contact_email": vendor.contact_email,
        "rating": vendor.rating,
        "is_verified": vendor.is_verified,
        "assigned_trip_ids": trip_ids,
        "assigned_trip_count": len(trip_ids),
    }


def list_activity_inventory(
    db: Session, destination_id: Optional[str] = None, active_only: bool = True
) -> List[Dict[str, Any]]:
    """Bookable activity inventory from the database for assignment pickers."""
    from backend.models.models import Activity as ActivityModel

    query = db.query(ActivityModel).order_by(ActivityModel.rating.desc(), ActivityModel.title.asc())
    if active_only:
        query = query.filter(ActivityModel.is_active == True)  # noqa: E712
    if destination_id:
        query = query.filter(ActivityModel.destination_id == destination_id.strip())
    out = []
    for activity in query.all():
        destination = (
            db.query(Destination).filter(Destination.id == activity.destination_id).first()
        )
        out.append(
            {
                "id": activity.id,
                "title": activity.title,
                "category": activity.category,
                "duration_hours": activity.duration_hours,
                "price_per_person": activity.price_per_person,
                "currency": activity.currency,
                "rating": activity.rating,
                "capacity": activity.capacity,
                "destination_id": activity.destination_id,
                "destination_name": destination.name if destination else None,
                "is_active": activity.is_active,
            }
        )
    return out


# ---------------------------------------------------------------------------
# Traveler trip confirmation (planning -> confirmed, idempotent)
# ---------------------------------------------------------------------------

CONFIRMABLE_TRIP_STATUSES = ("planning", "draft")


def confirm_trip(db: Session, trip_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
    """Validate and persist traveler confirmation of a database trip.

    Rules: trip must exist (404); caller identity, when supplied, must own the
    trip (403 otherwise); only planning/draft trips confirm (already-confirmed
    returns the existing state without duplicating history/notifications);
    dates, traveler count, destination, and well-formed itinerary selections
    are validated (422). No ops assignments are fabricated: existing
    hotel/activity/transport rows are left untouched.
    """
    from datetime import datetime as _datetime

    from backend.models.models import ChangeHistory as _ChangeHistory
    from backend.models.models import Notification as _Notification

    trip = db.query(Trip).filter(Trip.id == str(trip_id or "").strip()).first()
    if not trip:
        raise OpsNotFound("Trip not found")
    if user_id is not None and str(user_id).strip() != trip.user_id:
        raise OpsForbidden("Trip does not belong to this traveler")
    if trip.status == "confirmed":
        return {"already_confirmed": True, "confirmed_at": trip.confirmed_at}
    if trip.status not in CONFIRMABLE_TRIP_STATUSES:
        raise OpsValidation(f"Only planning trips can be confirmed (current: {trip.status})")
    if not trip.destination_id:
        raise OpsValidation("Trip has no destination")
    if not trip.start_date or not trip.end_date:
        raise OpsValidation("Trip dates are required before confirmation")
    if trip.end_date < trip.start_date:
        raise OpsValidation("Trip end date is before start date")
    if not trip.traveler_count or trip.traveler_count < 1:
        raise OpsValidation("Traveler count must be at least 1")
    items = list(trip.itinerary or [])
    if not items:
        raise OpsValidation("Trip has no itinerary items to confirm")
    for item in items:
        if not (item.title or "").strip():
            raise OpsValidation("Itinerary contains an untitled item")
        if (item.cost or 0) < 0:
            raise OpsValidation("Itinerary contains a negative cost")

    now = _datetime.utcnow()
    trip.status = "confirmed"
    trip.confirmed_at = now
    trip.confirmed_by = trip.user_id
    db.add(
        _ChangeHistory(
            trip_id=trip.id,
            changed_by="user",
            action="trip_confirmed",
            field_changed="status",
            old_value="planning",
            new_value="confirmed",
            reason="Traveler reviewed and confirmed the trip for operations",
        )
    )
    db.add(
        _Notification(
            trip_id=trip.id,
            user_id=trip.user_id,
            title="Trip Confirmed",
            message=(
                f"Trip '{trip.title}' ({trip.id}) is confirmed and visible "
                f"to the operations team."
            ),
            type="success",
        )
    )
    db.commit()
    return {"already_confirmed": False, "confirmed_at": now}


# ---------------------------------------------------------------------------
# Trip communications (internal operator messages; traveler-invisible)
# ---------------------------------------------------------------------------

TRIP_MESSAGE_CATEGORIES = ("general", "operational", "hotel", "transport", "activity", "urgent")
TRIP_MESSAGE_BODY_MAX_LENGTH = 2000


def _message_dict(row: TripMessage) -> Dict[str, Any]:
    return {
        "id": row.id,
        "trip_id": row.trip_id,
        "operator_name": row.operator_name,
        "category": row.category,
        "body": row.body,
        "is_urgent": bool(row.is_urgent),
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _require_message_category(category: Any) -> str:
    cleaned = str(category or "general").strip().lower()
    if cleaned not in TRIP_MESSAGE_CATEGORIES:
        raise OpsValidation(
            f"category must be one of: {', '.join(TRIP_MESSAGE_CATEGORIES)}"
        )
    return cleaned


def _require_message_body(body: Any) -> str:
    cleaned = str(body or "").strip()
    if not cleaned:
        raise OpsValidation("body is required")
    if len(cleaned) > TRIP_MESSAGE_BODY_MAX_LENGTH:
        raise OpsValidation(
            f"body must be at most {TRIP_MESSAGE_BODY_MAX_LENGTH} characters"
        )
    return cleaned


def list_trip_messages(
    db: Session, trip_id: str, category: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Chronological internal messages for one trip, optionally by category."""
    cleaned_trip = _require_trip_id(trip_id)
    query = db.query(TripMessage).filter(TripMessage.trip_id == cleaned_trip)
    if category is not None:
        query = query.filter(TripMessage.category == _require_message_category(category))
    rows = query.order_by(TripMessage.created_at.asc(), TripMessage.id.asc()).all()
    return [_message_dict(row) for row in rows]


def create_trip_message(
    db: Session,
    trip_id: str,
    body: str,
    operator_name: Optional[str] = None,
    category: Optional[str] = None,
    is_urgent: bool = False,
) -> Dict[str, Any]:
    """Persist one internal operator message for a trip."""
    cleaned_trip = _require_trip_id(trip_id)
    cleaned_body = _require_message_body(body)
    cleaned_category = _require_message_category(category)
    cleaned_operator = str(operator_name or "operator").strip() or "operator"
    if len(cleaned_operator) > 100:
        raise OpsValidation("operator_name must be at most 100 characters")
    row = TripMessage(
        trip_id=cleaned_trip,
        operator_name=cleaned_operator,
        category=cleaned_category,
        body=cleaned_body,
        # The urgent category is always visually urgent.
        is_urgent=bool(is_urgent) or cleaned_category == "urgent",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _message_dict(row)


def trip_messages_overview(db: Session) -> List[Dict[str, Any]]:
    """Per-trip message counts for the communications trip list."""
    from sqlalchemy import case, func

    rows = (
        db.query(
            TripMessage.trip_id,
            func.count(TripMessage.id).label("message_count"),
            func.sum(case((TripMessage.is_urgent.is_(True), 1), else_=0)).label("urgent_count"),
            func.max(TripMessage.created_at).label("latest_at"),
        )
        .group_by(TripMessage.trip_id)
        .all()
    )
    overview = []
    for trip_id, message_count, urgent_count, latest_at in rows:
        overview.append(
            {
                "trip_id": trip_id,
                "message_count": int(message_count or 0),
                "urgent_count": int(urgent_count or 0),
                "latest_at": latest_at.isoformat() if latest_at else None,
            }
        )
    return overview
