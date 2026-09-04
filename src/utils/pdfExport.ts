import { jsPDF } from 'jspdf';

export interface TripPDFData {
  title: string;
  destination: string;
  origin?: string;
  dates: string;
  durationDays: number;
  travelers: number;
  travelType: string;
  targetBudget: number;
  totalCost: number;
  currency: string;
  transport?: {
    operator: string;
    mode: string;
    route_summary: string;
    departure_time: string;
    arrival_time: string;
    total_price: number;
  };
  accommodation?: {
    name: string;
    category: string;
    location: string;
    room_type: string;
    total_price: number;
    price_per_night: number;
    nights: number;
  };
  costBreakdown?: {
    transport: number;
    accommodation: number;
    activities: number;
    food_and_other: number;
    total: number;
    target_budget: number;
    remaining_budget: number;
    is_under_budget: boolean;
  };
  itinerary: Array<{
    day_number: number;
    order_index: number;
    item_type: string;
    title: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    cost: number;
    location?: string;
  }>;
}

export function exportTripToPDF(data: TripPDFData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  let y = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      renderHeaderFooter();
    }
  };

  const renderHeaderFooter = () => {
    // Header watermark / brand
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 150);
    doc.setFont('helvetica', 'normal');
    doc.text('TourFlow AI — Smart Verified Travel Routing Engine', margin, 10);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth - margin, 10, { align: 'right' });
    doc.setDrawColor(220, 220, 235);
    doc.line(margin, 12, pageWidth - margin, 12);
  };

  // 1. First Page Header
  renderHeaderFooter();
  y = 20;

  // Title Banner
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 28, 4, 4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(data.title || `Trip to ${data.destination}`, margin + 6, y + 10);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const subtitle = `${data.destination} • ${data.dates} • ${data.durationDays} Days • ${data.travelers} Travelers (${data.travelType})`;
  doc.text(subtitle, margin + 6, y + 18);

  const budgetStr = `Budget Target: Rs. ${data.targetBudget.toLocaleString()} | Est. Cost: Rs. ${data.totalCost.toLocaleString()}`;
  doc.text(budgetStr, margin + 6, y + 24);

  y += 36;

  // 2. Budget & Alignment Summary Box
  checkPageBreak(35);
  doc.setFillColor(245, 243, 255); // Violet 50
  doc.setDrawColor(221, 214, 254); // Violet 200
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 26, 3, 3, 'FD');

  doc.setTextColor(91, 33, 182); // Muted violet
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('BUDGET ALIGNMENT & EXPENSE SUMMARY', margin + 5, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  const colW = (pageWidth - 2 * margin - 10) / 4;
  const cb = data.costBreakdown || {
    transport: data.transport?.total_price || 0,
    accommodation: data.accommodation?.total_price || 0,
    activities: 0,
    food_and_other: 0,
    total: data.totalCost,
    target_budget: data.targetBudget,
    remaining_budget: data.targetBudget - data.totalCost,
    is_under_budget: data.totalCost <= data.targetBudget,
  };

  doc.text(`Transport: Rs. ${cb.transport.toLocaleString()}`, margin + 5, y + 15);
  doc.text(`Stay: Rs. ${cb.accommodation.toLocaleString()}`, margin + 5 + colW, y + 15);
  doc.text(`Activities: Rs. ${cb.activities.toLocaleString()}`, margin + 5 + colW * 2, y + 15);
  doc.text(`Meals/Misc: Rs. ${cb.food_and_other.toLocaleString()}`, margin + 5 + colW * 3, y + 15);

  doc.setFont('helvetica', 'bold');
  const statusMsg = cb.is_under_budget
    ? `Status: ON TRACK (Rs. ${Math.abs(cb.remaining_budget).toLocaleString()} under budget)`
    : `Status: OVER BUDGET by Rs. ${Math.abs(cb.remaining_budget).toLocaleString()}`;
  if (cb.is_under_budget) {
    doc.setTextColor(5, 150, 105);
  } else {
    doc.setTextColor(220, 38, 38);
  }
  doc.text(`Total: Rs. ${cb.total.toLocaleString()}  |  ${statusMsg}`, margin + 5, y + 22);

  y += 34;

  // 3. Transport & Accommodation Details
  checkPageBreak(40);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Verified Bookings & Logistics', margin, y);
  y += 6;

  // Split into 2 columns for Transport & Hotel
  const halfW = (pageWidth - 2 * margin - 6) / 2;

  // Transport Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, halfW, 28, 3, 3, 'FD');
  doc.setTextColor(79, 70, 229);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Transport (${data.transport?.mode?.toUpperCase() || 'TRANSIT'})`, margin + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.text(doc.splitTextToSize(data.transport?.operator || 'Verified Transit Route', halfW - 8), margin + 4, y + 12);
  doc.text(`Dep: ${data.transport?.departure_time || 'N/A'}  •  Arr: ${data.transport?.arrival_time || 'N/A'}`, margin + 4, y + 18);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total: Rs. ${(data.transport?.total_price || 0).toLocaleString()}`, margin + 4, y + 24);

  // Accommodation Card
  doc.roundedRect(margin + halfW + 6, y, halfW, 28, 3, 3, 'FD');
  doc.setTextColor(79, 70, 229);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Stay (${data.accommodation?.category?.toUpperCase() || 'HOTEL'})`, margin + halfW + 10, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.text(doc.splitTextToSize(data.accommodation?.name || 'Curated Accommodation', halfW - 8), margin + halfW + 10, y + 12);
  doc.text(doc.splitTextToSize(data.accommodation?.location || data.destination, halfW - 8), margin + halfW + 10, y + 18);
  doc.setFont('helvetica', 'bold');
  doc.text(`Rs. ${(data.accommodation?.total_price || 0).toLocaleString()} (${data.accommodation?.nights || data.durationDays - 1} nights)`, margin + halfW + 10, y + 24);

  y += 36;

  // 4. Day-by-Day Detailed Itinerary
  checkPageBreak(25);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Day-by-Day Schedule & Real Landmarks', margin, y);
  y += 8;

  // Group by day
  const daysMap = new Map<number, typeof data.itinerary>();
  for (const item of data.itinerary) {
    if (!daysMap.has(item.day_number)) {
      daysMap.set(item.day_number, []);
    }
    daysMap.get(item.day_number)!.push(item);
  }

  const sortedDays = Array.from(daysMap.keys()).sort((a, b) => a - b);

  for (const dayNum of sortedDays) {
    const items = daysMap.get(dayNum)!;
    checkPageBreak(20 + items.length * 14);

    // Day Header Pill
    doc.setFillColor(238, 242, 255); // Indigo 50
    doc.setDrawColor(199, 210, 254);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 8, 2, 2, 'FD');
    doc.setTextColor(67, 56, 202);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(`Day ${dayNum} of ${data.durationDays}`, margin + 4, y + 5.5);
    y += 12;

    // Items list
    for (const it of items) {
      checkPageBreak(14);
      const timeStr = it.start_time ? `${it.start_time}${it.end_time ? ' - ' + it.end_time : ''}` : '';
      const typeBadge = `[${it.item_type.toUpperCase()}]`;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${typeBadge} ${it.title}`, margin + 4, y);

      if (it.cost > 0) {
        doc.setTextColor(91, 33, 182);
        doc.text(`Rs. ${it.cost.toLocaleString()}`, pageWidth - margin - 4, y, { align: 'right' });
      }

      y += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);

      if (it.location || timeStr) {
        const metaLine = [timeStr, it.location].filter(Boolean).join(' • ');
        doc.text(metaLine, margin + 4, y);
        y += 4;
      }

      if (it.description) {
        const lines = doc.splitTextToSize(it.description, pageWidth - 2 * margin - 8);
        doc.text(lines.slice(0, 2), margin + 4, y);
        y += lines.slice(0, 2).length * 3.5;
      }

      y += 3;
    }

    y += 4;
  }

  // Save / Trigger Download
  const filename = `${data.destination.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-itinerary.pdf`;
  doc.save(filename);
}
