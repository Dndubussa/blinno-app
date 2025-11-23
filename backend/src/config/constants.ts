// User Roles
export enum AppRole {
  ADMIN = 'admin',
  USER = 'user',
  CREATOR = 'creator',
  FREELANCER = 'freelancer',
  SELLER = 'seller',
  LODGING = 'lodging',
  RESTAURANT = 'restaurant',
  EDUCATOR = 'educator',
  JOURNALIST = 'journalist',
  ARTISAN = 'artisan',
  EMPLOYER = 'employer',
  EVENT_ORGANIZER = 'event_organizer',
  MODERATOR = 'moderator',
}

// Booking Status
export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

// Order Status
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

// Project Status
export enum ProjectStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// Proposal Status
export enum ProposalStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

// Invoice Status
export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

// Commission Status
export enum CommissionStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// Payment Status
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIAL = 'partial',
}

// Event Status
export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

// Job Application Status
export enum JobApplicationStatus {
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  SHORTLISTED = 'shortlisted',
  INTERVIEWED = 'interviewed',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

// Subscription Status
export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  PAUSED = 'paused',
}

