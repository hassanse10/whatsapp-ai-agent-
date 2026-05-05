const logger = require('../utils/logger');
const { generateTrackingNumber } = require('../utils/helpers');

const TRACKING_STATUSES = {
  PENDING: 'pending',
  IN_TRANSIT: 'in_transit',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  DELAYED: 'delayed',
  EXCEPTION: 'exception',
};

const generateMockTracking = (orderId) => {
  const statuses = ['pending', 'in_transit', 'out_for_delivery'];
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

  const daysFromNow = Math.floor(Math.random() * 5) + 1;
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + daysFromNow);

  return {
    tracking_number: generateTrackingNumber(),
    status: randomStatus,
    current_location: getRandomLocation(),
    last_update: new Date().toISOString(),
    estimated_delivery: deliveryDate.toISOString().split('T')[0],
    events: generateTrackingEvents(randomStatus),
  };
};

const getRandomLocation = () => {
  const locations = [
    'مركز التوزيع، الدار البيضاء',
    'مستودع الفرز، الرباط',
    'محطة التسليم المحلية، مراكش',
    'مركز اللوجيستيك، فاس',
    'في الطريق',
    'خارج للتسليم',
    'مستودع، طنجة',
  ];
  return locations[Math.floor(Math.random() * locations.length)];
};

const generateTrackingEvents = (status) => {
  const events = [];
  const now = new Date();

  events.push({
    timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    location: 'المستودع',
    description: 'تم تجهيز وتغليف الطلبية',
  });

  if (status === 'in_transit' || status === 'out_for_delivery' || status === 'delivered') {
    events.push({
      timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
      status: 'in_transit',
      location: 'مركز التوزيع',
      description: 'الطرد في الطريق نحو وجهة التسليم',
    });
  }

  if (status === 'out_for_delivery' || status === 'delivered') {
    events.push({
      timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      status: 'out_for_delivery',
      location: 'التسليم المحلي',
      description: 'خرج مع عامل التوصيل',
    });
  }

  if (status === 'delivered') {
    events.push({
      timestamp: now.toISOString(),
      status: 'delivered',
      location: 'عنوان التسليم',
      description: 'تم تسليم الطرد بنجاح',
    });
  }

  return events;
};

const trackPackage = (trackingNumber) => {
  const mockData = generateMockTracking(Math.random());
  mockData.tracking_number = trackingNumber;
  logger.debug('Package tracked', { trackingNumber });
  return mockData;
};

const STATUS_LABELS = {
  pending: 'في الانتظار',
  in_transit: 'في الطريق',
  out_for_delivery: 'خارج للتسليم',
  delivered: 'تم التسليم',
  delayed: 'متأخر',
  exception: 'مشكل في التوصيل',
};

const formatTrackingInfo = (tracking) => {
  const statusLabel = STATUS_LABELS[tracking.status] || tracking.status;
  let info = `📍 *معلومات التتبع*\n`;
  info += `رقم التتبع: ${tracking.tracking_number}\n`;
  info += `الحالة: ${statusLabel}\n`;
  info += `الموقع الحالي: ${tracking.current_location}\n`;
  info += `التسليم المتوقع: ${tracking.estimated_delivery}\n\n`;

  info += `آخر التحديثات:\n`;
  if (tracking.events && tracking.events.length > 0) {
    const recentEvents = tracking.events.slice(-3).reverse();
    recentEvents.forEach(event => {
      const date = new Date(event.timestamp);
      const timeStr = date.toLocaleDateString('ar-MA') + ' ' + date.toLocaleTimeString('ar-MA');
      info += `• ${timeStr}\n`;
      info += `  ${event.description}\n`;
      info += `  الموقع: ${event.location}\n\n`;
    });
  }

  return info;
};

const estimateDeliveryDate = (orderId) => {
  const daysFromNow = Math.floor(Math.random() * 7) + 3;
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
};

module.exports = {
  trackPackage,
  formatTrackingInfo,
  estimateDeliveryDate,
  generateMockTracking,
  TRACKING_STATUSES,
};
