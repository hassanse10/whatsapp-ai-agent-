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
    'Distribution Center, Los Angeles, CA',
    'Regional Hub, Chicago, IL',
    'Sorting Facility, New York, NY',
    'Local Delivery Station, Miami, FL',
    'In Transit',
    'Out for Delivery',
    'Warehouse, Dallas, TX',
  ];
  return locations[Math.floor(Math.random() * locations.length)];
};

const generateTrackingEvents = (status) => {
  const events = [];
  const now = new Date();

  events.push({
    timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    location: 'Warehouse',
    description: 'Order picked and packed',
  });

  if (status === 'in_transit' || status === 'out_for_delivery' || status === 'delivered') {
    events.push({
      timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
      status: 'in_transit',
      location: 'Distribution Center',
      description: 'Package in transit to delivery location',
    });
  }

  if (status === 'out_for_delivery' || status === 'delivered') {
    events.push({
      timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      status: 'out_for_delivery',
      location: 'Local Delivery',
      description: 'Out for delivery with driver',
    });
  }

  if (status === 'delivered') {
    events.push({
      timestamp: now.toISOString(),
      status: 'delivered',
      location: 'Delivery Address',
      description: 'Package delivered successfully',
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

const formatTrackingInfo = (tracking) => {
  let info = `📍 Tracking Information\n`;
  info += `Tracking Number: ${tracking.tracking_number}\n`;
  info += `Status: ${tracking.status.toUpperCase()}\n`;
  info += `Current Location: ${tracking.current_location}\n`;
  info += `Estimated Delivery: ${tracking.estimated_delivery}\n\n`;

  info += `Recent Updates:\n`;
  if (tracking.events && tracking.events.length > 0) {
    const recentEvents = tracking.events.slice(-3).reverse();
    recentEvents.forEach(event => {
      const date = new Date(event.timestamp);
      const timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
      info += `• ${timeStr}\n`;
      info += `  ${event.description}\n`;
      info += `  Location: ${event.location}\n\n`;
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
