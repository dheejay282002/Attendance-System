// Reference: javascript_database blueprint - adapted for attendance system
import {
  users,
  students,
  courses,
  sections,
  events,
  eventCourseSections,
  attendance,
  systemSettings,
  type User,
  type InsertUser,
  type Student,
  type InsertStudent,
  type Course,
  type InsertCourse,
  type Section,
  type InsertSection,
  type Event,
  type InsertEvent,
  type EventCourseSection,
  type InsertEventCourseSection,
  type Attendance,
  type InsertAttendance,
  type SystemSettings,
  type InsertSystemSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Students
  getStudent(id: string): Promise<any | undefined>;
  getStudentByStudentId(studentId: string): Promise<any | undefined>;
  getAllStudents(): Promise<any[]>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: string, student: Partial<InsertStudent>): Promise<Student | undefined>;
  deleteStudent(id: string): Promise<void>;
  
  // Courses
  getCourse(id: string): Promise<Course | undefined>;
  getAllCourses(): Promise<Course[]>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, course: Partial<InsertCourse>): Promise<Course | undefined>;
  deleteCourse(id: string): Promise<void>;
  
  // Sections
  getSection(id: string): Promise<any | undefined>;
  getAllSections(): Promise<any[]>;
  createSection(section: InsertSection): Promise<Section>;
  updateSection(id: string, section: Partial<InsertSection>): Promise<Section | undefined>;
  deleteSection(id: string): Promise<void>;
  
  // Events
  getEvent(id: string): Promise<any | undefined>;
  getAllEvents(): Promise<any[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<void>;
  
  // Event Course Sections
  createEventCourseSection(ecs: InsertEventCourseSection): Promise<EventCourseSection>;
  getEventCourseSections(eventId: string): Promise<any[]>;
  deleteEventCourseSections(eventId: string): Promise<void>;
  
  // Attendance
  getAttendance(eventId: string, studentId: string): Promise<Attendance | undefined>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: string, attendance: Partial<InsertAttendance>): Promise<Attendance | undefined>;
  getAllAttendanceForStudent(studentId: string): Promise<any[]>;
  
  // System Settings
  getSystemSettings(): Promise<SystemSettings | undefined>;
  updateSystemSettings(settings: Partial<InsertSystemSettings>): Promise<SystemSettings>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Students
  async getStudent(id: string): Promise<any | undefined> {
    const [student] = await db
      .select()
      .from(students)
      .leftJoin(courses, eq(students.courseId, courses.id))
      .leftJoin(sections, eq(students.sectionId, sections.id))
      .where(eq(students.id, id));
    
    if (!student) return undefined;
    return {
      ...student.students,
      course: student.courses,
      section: student.sections,
    };
  }

  async getStudentByStudentId(studentId: string): Promise<any | undefined> {
    const [student] = await db
      .select()
      .from(students)
      .leftJoin(courses, eq(students.courseId, courses.id))
      .leftJoin(sections, eq(students.sectionId, sections.id))
      .where(eq(students.studentId, studentId));
    
    if (!student) return undefined;
    return {
      ...student.students,
      course: student.courses,
      section: student.sections,
    };
  }

  async getAllStudents(): Promise<any[]> {
    const results = await db
      .select()
      .from(students)
      .leftJoin(courses, eq(students.courseId, courses.id))
      .leftJoin(sections, eq(students.sectionId, sections.id));
    
    return results.map((r) => ({
      ...r.students,
      course: r.courses,
      section: r.sections,
    }));
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const [student] = await db.insert(students).values(insertStudent).returning();
    return student;
  }

  async updateStudent(id: string, insertStudent: Partial<InsertStudent>): Promise<Student | undefined> {
    const [student] = await db
      .update(students)
      .set(insertStudent)
      .where(eq(students.id, id))
      .returning();
    return student || undefined;
  }

  async deleteStudent(id: string): Promise<void> {
    await db.delete(students).where(eq(students.id, id));
  }

  // Courses
  async getCourse(id: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course || undefined;
  }

  async getAllCourses(): Promise<Course[]> {
    return await db.select().from(courses);
  }

  async createCourse(insertCourse: InsertCourse): Promise<Course> {
    const [course] = await db.insert(courses).values(insertCourse).returning();
    return course;
  }

  async updateCourse(id: string, insertCourse: Partial<InsertCourse>): Promise<Course | undefined> {
    const [course] = await db
      .update(courses)
      .set(insertCourse)
      .where(eq(courses.id, id))
      .returning();
    return course || undefined;
  }

  async deleteCourse(id: string): Promise<void> {
    await db.delete(courses).where(eq(courses.id, id));
  }

  // Sections
  async getSection(id: string): Promise<any | undefined> {
    const [section] = await db
      .select()
      .from(sections)
      .leftJoin(courses, eq(sections.courseId, courses.id))
      .where(eq(sections.id, id));
    
    if (!section) return undefined;
    return {
      ...section.sections,
      course: section.courses,
    };
  }

  async getAllSections(): Promise<any[]> {
    const results = await db
      .select()
      .from(sections)
      .leftJoin(courses, eq(sections.courseId, courses.id));
    
    return results.map((r) => ({
      ...r.sections,
      course: r.courses,
    }));
  }

  async createSection(insertSection: InsertSection): Promise<Section> {
    const [section] = await db.insert(sections).values(insertSection).returning();
    return section;
  }

  async updateSection(id: string, insertSection: Partial<InsertSection>): Promise<Section | undefined> {
    const [section] = await db
      .update(sections)
      .set(insertSection)
      .where(eq(sections.id, id))
      .returning();
    return section || undefined;
  }

  async deleteSection(id: string): Promise<void> {
    await db.delete(sections).where(eq(sections.id, id));
  }

  // Events
  async getEvent(id: string): Promise<any | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    if (!event) return undefined;

    const ecs = await this.getEventCourseSections(id);
    return {
      ...event,
      eventCourseSections: ecs,
    };
  }

  async getAllEvents(): Promise<any[]> {
    const allEvents = await db.select().from(events);
    
    const eventsWithSections = await Promise.all(
      allEvents.map(async (event) => ({
        ...event,
        eventCourseSections: await this.getEventCourseSections(event.id),
      }))
    );
    
    return eventsWithSections;
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(insertEvent).returning();
    return event;
  }

  async updateEvent(id: string, insertEvent: Partial<InsertEvent>): Promise<Event | undefined> {
    const [event] = await db
      .update(events)
      .set(insertEvent)
      .where(eq(events.id, id))
      .returning();
    return event || undefined;
  }

  async deleteEvent(id: string): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  // Event Course Sections
  async createEventCourseSection(insertEcs: InsertEventCourseSection): Promise<EventCourseSection> {
    const [ecs] = await db.insert(eventCourseSections).values(insertEcs).returning();
    return ecs;
  }

  async getEventCourseSections(eventId: string): Promise<any[]> {
    const results = await db
      .select()
      .from(eventCourseSections)
      .leftJoin(courses, eq(eventCourseSections.courseId, courses.id))
      .leftJoin(sections, eq(eventCourseSections.sectionId, sections.id))
      .where(eq(eventCourseSections.eventId, eventId));
    
    return results.map((r) => ({
      ...r.event_course_sections,
      course: r.courses,
      section: r.sections,
    }));
  }

  async deleteEventCourseSections(eventId: string): Promise<void> {
    await db.delete(eventCourseSections).where(eq(eventCourseSections.eventId, eventId));
  }

  // Attendance
  async getAttendance(eventId: string, studentId: string): Promise<Attendance | undefined> {
    const [record] = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.eventId, eventId), eq(attendance.studentId, studentId)));
    return record || undefined;
  }

  async createAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    const [record] = await db.insert(attendance).values(insertAttendance).returning();
    return record;
  }

  async updateAttendance(id: string, insertAttendance: Partial<InsertAttendance>): Promise<Attendance | undefined> {
    const [record] = await db
      .update(attendance)
      .set(insertAttendance)
      .where(eq(attendance.id, id))
      .returning();
    return record || undefined;
  }

  async getAllAttendanceForStudent(studentId: string): Promise<any[]> {
    const results = await db
      .select()
      .from(attendance)
      .leftJoin(events, eq(attendance.eventId, events.id))
      .where(eq(attendance.studentId, studentId));
    
    return results.map((r) => ({
      ...r.attendance,
      event: r.events,
    }));
  }

  // System Settings
  async getSystemSettings(): Promise<SystemSettings | undefined> {
    const [settings] = await db.select().from(systemSettings).limit(1);
    return settings || undefined;
  }

  async updateSystemSettings(insertSettings: Partial<InsertSystemSettings>): Promise<SystemSettings> {
    const existing = await this.getSystemSettings();
    
    if (existing) {
      const [updated] = await db
        .update(systemSettings)
        .set({ ...insertSettings, updatedAt: new Date() })
        .where(eq(systemSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(systemSettings).values(insertSettings as InsertSystemSettings).returning();
      return created;
    }
  }
}

export const storage = new DatabaseStorage();
