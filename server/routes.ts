import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import Papa from "papaparse";
import {
  insertStudentSchema,
  insertCourseSchema,
  insertSectionSchema,
  insertEventSchema,
  insertSystemSettingsSchema,
} from "@shared/schema";
import { z } from "zod";

// Ensure JWT_SECRET is set - fail fast if missing
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable must be set");
}
const JWT_SECRET = process.env.SESSION_SECRET;

// Multer configuration for file uploads with security constraints
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 2 * 1024 * 1024, // 2MB max
    files: 1, // Only one file per request
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  },
});

// Auth middleware
interface AuthRequest extends Request {
  user?: any;
}

const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "No authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Global error handler middleware for Multer errors
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum size is 2MB.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ message: 'Too many files. Only one file allowed.' });
      }
      return res.status(400).json({ message: err.message });
    }
    if (err.message && err.message.includes('Invalid file type')) {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  });

  // Auth routes
  // Validation schemas
  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  const registerSchema = z.object({
    studentId: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    age: z.string().regex(/^\d+$/),
    birthday: z.string(),
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const validated = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(validated.email);

      if (!user || !(await bcrypt.compare(validated.password, user.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          studentId: user.studentId,
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/register", upload.single("profilePicture"), async (req: Request, res: Response) => {
    try {
      const validated = registerSchema.parse(req.body);
      const { studentId, email, password, age, birthday } = validated;
      const profilePicture = req.file;

      // Verify student exists
      const student = await storage.getStudentByStudentId(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student ID not found in system" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // Save profile picture (in production, upload to cloud storage)
      const profilePictureUrl = profilePicture
        ? `data:${profilePicture.mimetype};base64,${profilePicture.buffer.toString("base64")}`
        : "";

      // Update student with additional info
      await storage.updateStudent(student.id, {
        age: parseInt(age),
        email,
        birthday,
        profilePicture: profilePictureUrl,
      });

      // Create user account
      await storage.createUser({
        email,
        password: hashedPassword,
        role: "student",
        studentId,
      });

      res.json({ message: "Registration successful" });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Student verification for registration
  app.post("/api/students/verify", async (req: Request, res: Response) => {
    try {
      const { studentId } = req.body;
      const student = await storage.getStudentByStudentId(studentId);

      if (!student) {
        return res.status(404).json(null);
      }

      res.json(student);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Student CRUD routes (Admin only)
  app.get("/api/students", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const students = await storage.getAllStudents();
      res.json(students);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/students", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validated = insertStudentSchema.parse(req.body);
      const student = await storage.createStudent(validated);
      res.json(student);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/students/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const student = await storage.updateStudent(req.params.id, req.body);
      res.json(student);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/students/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deleteStudent(req.params.id);
      res.json({ message: "Student deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // CSV import/export
  app.post("/api/students/import", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { students } = req.body;
      for (const student of students) {
        if (student.studentId && student.name && student.courseId && student.sectionId) {
          await storage.createStudent(student);
        }
      }

      res.json({ message: "Import successful" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Course CRUD routes
  app.get("/api/courses", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const courses = await storage.getAllCourses();
      res.json(courses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/courses", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validated = insertCourseSchema.parse(req.body);
      const course = await storage.createCourse(validated);
      res.json(course);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/courses/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const course = await storage.updateCourse(req.params.id, req.body);
      res.json(course);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/courses/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deleteCourse(req.params.id);
      res.json({ message: "Course deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Section CRUD routes
  app.get("/api/sections", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const sections = await storage.getAllSections();
      res.json(sections);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/sections", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validated = insertSectionSchema.parse(req.body);
      const section = await storage.createSection(validated);
      res.json(section);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/sections/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const section = await storage.updateSection(req.params.id, req.body);
      res.json(section);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/sections/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deleteSection(req.params.id);
      res.json({ message: "Section deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Event CRUD routes
  app.get("/api/events", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const events = await storage.getAllEvents();
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/events", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { courseSections, ...eventData } = req.body;
      
      // Validate event data
      const validated = insertEventSchema.parse(eventData);

      // Generate QR code data
      const eventId = uuidv4();
      const qrCodeData = JSON.stringify({ eventId, timestamp: Date.now() });
      const qrCode = await QRCode.toDataURL(qrCodeData);

      const event = await storage.createEvent({
        ...validated,
        qrCodeData,
        qrCode,
      });

      // Create event-course-section associations
      if (courseSections && courseSections.length > 0) {
        for (const cs of courseSections) {
          await storage.createEventCourseSection({
            eventId: event.id,
            courseId: cs.courseId,
            sectionId: cs.sectionId,
          });
        }
      }

      res.json(event);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/events/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { courseSections, ...eventData } = req.body;

      const event = await storage.updateEvent(req.params.id, eventData);

      // Update event-course-section associations
      if (courseSections) {
        await storage.deleteEventCourseSections(req.params.id);
        for (const cs of courseSections) {
          await storage.createEventCourseSection({
            eventId: req.params.id,
            courseId: cs.courseId,
            sectionId: cs.sectionId,
          });
        }
      }

      res.json(event);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/events/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deleteEventCourseSections(req.params.id);
      await storage.deleteEvent(req.params.id);
      res.json({ message: "Event deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Regenerate QR code
  app.post("/api/events/:id/regenerate-qr", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const qrCodeData = JSON.stringify({ eventId: req.params.id, timestamp: Date.now() });
      const qrCode = await QRCode.toDataURL(qrCodeData);

      const event = await storage.updateEvent(req.params.id, { qrCodeData, qrCode });
      res.json(event);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Attendance check-in
  app.post("/api/attendance/checkin", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { qrCodeData, studentId: manualStudentId, eventId: manualEventId } = req.body;

      let eventId: string;
      let studentId: string;

      if (qrCodeData) {
        // QR code scan
        const data = JSON.parse(qrCodeData);
        eventId = data.eventId;
        
        // Get student from authenticated user
        if (!req.user.studentId) {
          return res.status(400).json({ message: "Not a student account" });
        }
        const student = await storage.getStudentByStudentId(req.user.studentId);
        if (!student) {
          return res.status(404).json({ message: "Student not found" });
        }
        studentId = student.id;
      } else if (manualStudentId && manualEventId) {
        // Manual entry
        eventId = manualEventId;
        const student = await storage.getStudentByStudentId(manualStudentId);
        if (!student) {
          return res.status(404).json({ message: "Student not found" });
        }
        studentId = student.id;
      } else {
        return res.status(400).json({ message: "Invalid check-in data" });
      }

      // Check if attendance record exists
      let attendance = await storage.getAttendance(eventId, studentId);

      if (!attendance) {
        // Create new attendance with time-in
        attendance = await storage.createAttendance({
          eventId,
          studentId,
          timeIn: new Date(),
          timeOut: null,
        });
        res.json({ type: "in", attendance });
      } else if (!attendance.timeOut) {
        // Update with time-out
        const updated = await storage.updateAttendance(attendance.id, {
          timeOut: new Date(),
        });
        res.json({ type: "out", attendance: updated });
      } else {
        res.status(400).json({ message: "Attendance already complete" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Student-specific routes
  app.get("/api/student/profile", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user.role !== "student") {
        return res.status(403).json({ message: "Student access required" });
      }

      const student = await storage.getStudentByStudentId(req.user.studentId);
      res.json(student);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/student/profile", authMiddleware, upload.single("profilePicture"), async (req: AuthRequest, res: Response) => {
    try {
      if (req.user.role !== "student") {
        return res.status(403).json({ message: "Student access required" });
      }

      const student = await storage.getStudentByStudentId(req.user.studentId);
      const { age, email, birthday } = req.body;
      const profilePicture = req.file;

      const updateData: any = {
        age: parseInt(age),
        email,
        birthday,
      };

      if (profilePicture) {
        updateData.profilePicture = `data:${profilePicture.mimetype};base64,${profilePicture.buffer.toString("base64")}`;
      }

      const updated = await storage.updateStudent(student.id, updateData);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/student/stats", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user.role !== "student") {
        return res.status(403).json({ message: "Student access required" });
      }

      const student = await storage.getStudentByStudentId(req.user.studentId);
      const attendance = await storage.getAllAttendanceForStudent(student.id);

      const totalAttendance = attendance.filter(a => a.timeIn).length;
      const currentMonth = new Date().getMonth();
      const eventsThisMonth = attendance.filter(a => {
        const date = new Date(a.createdAt);
        return date.getMonth() === currentMonth && a.timeIn;
      }).length;

      res.json({
        totalAttendance,
        eventsThisMonth,
        attendanceRate: totalAttendance > 0 ? Math.round((totalAttendance / attendance.length) * 100) : 0,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/student/events", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user.role !== "student") {
        return res.status(403).json({ message: "Student access required" });
      }

      const student = await storage.getStudentByStudentId(req.user.studentId);
      const allEvents = await storage.getAllEvents();

      // Filter events for student's course and section
      const studentEvents = allEvents.filter(event => {
        return event.eventCourseSections.some((ecs: any) =>
          ecs.courseId === student.courseId && ecs.sectionId === student.sectionId
        );
      });

      // Add attendance info
      const eventsWithAttendance = await Promise.all(
        studentEvents.map(async (event) => {
          const attendance = await storage.getAttendance(event.id, student.id);
          return { ...event, attendance };
        })
      );

      res.json(eventsWithAttendance);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin stats
  app.get("/api/admin/stats", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const students = await storage.getAllStudents();
      const events = await storage.getAllEvents();
      const courses = await storage.getAllCourses();

      res.json({
        totalStudents: students.length,
        activeEvents: events.filter(e => e.isActive).length,
        totalAttendance: 0, // Would need to count all attendance records
        totalCourses: courses.length,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // System settings
  app.get("/api/settings", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json(settings || { systemName: "Attendance System", qrCodeEnabled: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/settings", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validated = insertSystemSettingsSchema.partial().parse(req.body);
      const settings = await storage.updateSystemSettings(validated);
      res.json(settings);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
