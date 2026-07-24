export class Booking {
  constructor({
    id,
    userId,
    eventId,
    ticketQuantity,
    totalPrice,
    qrCode,
    status,
    createdAt,
    updatedAt
  }) {
    this.id = id;
    this.userId = userId;
    this.eventId = eventId;
    this.ticketQuantity = parseInt(ticketQuantity, 10);
    this.totalPrice = parseFloat(totalPrice || 0);
    this.qrCode = qrCode;
    this.status = status || 'confirmed'; // 'pending', 'confirmed', 'cancelled'
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  isCancelled() {
    return this.status === 'cancelled';
  }

  isConfirmed() {
    return this.status === 'confirmed';
  }
}
