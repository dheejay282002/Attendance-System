import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - for authentication (admin and student accounts)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().$type<'admin' | 'student'>(),
  studentId: varchar("student_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Students table - student information managed by admin
export const students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: text("student_id").notNull().unique(),
  name: text("name").notNull(),
  courseId: varchar("course_id").notNull(),
  sectionId: varchar("section_id").notNull(),
  age: integer("age"),
  email: text("email"),
  birthday: text("birthday"),
  profilePicture: text("profile_picture"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Courses table
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Sections table
export const sections = pgTable("sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Events table
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  eventDate: text("event_date").notNull(),
  eventTime: text("event_time").notNull(),
  qrCode: text("qr_code"),
  qrCodeData: text("qr_code_data").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Event-Course-Section Junction table (many-to-many with sections)
export const eventCourseSections = pgTable("event_course_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull(),
  courseId: varchar("course_id").notNull(),
  sectionId: varchar("section_id").notNull(),
});

// Attendance table
export const attendance = pgTable("attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull(),
  studentId: varchar("student_id").notNull(),
  timeIn: timestamp("time_in"),
  timeOut: timestamp("time_out"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// System Settings table
export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  systemName: text("system_name").notNull().default("Attendance System"),
  qrCodeEnabled: boolean("qr_code_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  student: one(students, {
    fields: [users.studentId],
    references: [students.studentId],
  }),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  course: one(courses, {
    fields: [students.courseId],
    references: [courses.id],
  }),
  section: one(sections, {
    fields: [students.sectionId],
    references: [sections.id],
  }),
  attendance: many(attendance),
}));

export const coursesRelations = relations(courses, ({ many }) => ({
  students: many(students),
  sections: many(sections),
  eventCourseSections: many(eventCourseSections),
}));

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  course: one(courses, {
    fields: [sections.courseId],
    references: [courses.id],
  }),
  students: many(students),
  eventCourseSections: many(eventCourseSections),
}));

export const eventsRelations = relations(events, ({ many }) => ({
  eventCourseSections: many(eventCourseSections),
  attendance: many(attendance),
}));

export const eventCourseSectionsRelations = relations(eventCourseSections, ({ one }) => ({
  event: one(events, {
    fields: [eventCourseSections.eventId],
    references: [events.id],
  }),
  course: one(courses, {
    fields: [eventCourseSections.courseId],
    references: [courses.id],
  }),
  section: one(sections, {
    fields: [eventCourseSections.sectionId],
    references: [sections.id],
  }),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  event: one(events, {
    fields: [attendance.eventId],
    references: [events.id],
  }),
  student: one(students, {
    fields: [attendance.studentId],
    references: [students.id],
  }),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true,
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
});

export const insertSectionSchema = createInsertSchema(sections).omit({
  id: true,
  createdAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  qrCode: true,
  qrCodeData: true,
});

export const insertEventCourseSectionSchema = createInsertSchema(eventCourseSections).omit({
  id: true,
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  createdAt: true,
});

export const insertSystemSettingsSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;

export type Section = typeof sections.$inferSelect;
export type InsertSection = z.infer<typeof insertSectionSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type EventCourseSection = typeof eventCourseSections.$inferSelect;
export type InsertEventCourseSection = z.infer<typeof insertEventCourseSectionSchema>;

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

export type SystemSettings = typeof systemSettings.$inferSelect;
export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;
