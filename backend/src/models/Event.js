export class Event {
  constructor({
    id,
    title,
    description,
    bannerUrl,
    venue,
    dateTime,
    ticketPrice,
    maxCapacity,
    remainingSeats,
    category,
    registrationDeadline,
    status,
    createdBy,
    deletedAt,
    createdAt,
    updatedAt
  }) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.bannerUrl = bannerUrl;
    this.venue = venue;
    this.dateTime = new Date(dateTime);
    this.ticketPrice = parseFloat(ticketPrice || 0);
    this.maxCapacity = parseInt(maxCapacity, 10);
    this.remainingSeats = parseInt(remainingSeats, 10);
    this.category = category;
    this.registrationDeadline = new Date(registrationDeadline);
    this.status = status || 'active'; // 'active', 'cancelled', 'completed'
    this.createdBy = createdBy;
    this.deletedAt = deletedAt ? new Date(deletedAt) : null;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  isBookable() {
    if (this.status !== 'active') return false;
    if (this.deletedAt !== null) return false;
    if (this.remainingSeats <= 0) return false;
    
    const now = new Date();
    if (now > this.registrationDeadline) return false;
    
    return true;
  }

  isSoftDeleted() {
    return this.deletedAt !== null;
  }
}
