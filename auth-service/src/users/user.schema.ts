import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export enum UserRole {
  GENERAL_MANAGER = 'GENERAL_MANAGER',
  OPS_MANAGER = 'OPS_MANAGER',
  ENGINEER = 'ENGINEER',
}

@Schema({
  collection: 'users',
  timestamps: false, // IMPORTANT: your collection already manages dates
})
export class User {
  @Prop({ required: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true, enum: UserRole })
  role!: UserRole;

  @Prop({ required: true })
  country!: string;

  @Prop({ required: true })
  scopeType!: 'GLOBAL' | 'COUNTRY' | 'ORG';

  @Prop({ type: [String], default: [] })
  scopeCountries?: string[];

  @Prop({ default: true })
  isActive?: boolean;

  @Prop({ default: true })
  mustChangePassword?: boolean;

  @Prop({ type: Date, default: null })
  lastLoginAt?: Date | null;

  @Prop({ type: Date, default: null })
  passwordSetAt?: Date | null;

  @Prop({ type: Types.ObjectId, default: null })
  createdBy?: Types.ObjectId | null;

  @Prop({ type: Date, required: true })
  createdAt?: Date;

  @Prop({ type: Date, required: true })
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes (match how you query)
UserSchema.index({ email: 1 }, { unique: true, name: 'ux_users_email' });
UserSchema.index({ role: 1 }, { name: 'ix_users_role' });
UserSchema.index({ isActive: 1 }, { name: 'ix_users_isActive' });
