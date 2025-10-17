import { storage } from "./storage";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  // Create admin account
  const adminEmail = "admin@attendance.com";
  const existingAdmin = await storage.getUserByEmail(adminEmail);
  
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await storage.createUser({
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      studentId: null,
    });
    console.log("✓ Admin account created:");
    console.log("  Email: admin@attendance.com");
    console.log("  Password: admin123");
  } else {
    console.log("✓ Admin account already exists");
  }

  // Create sample courses
  const courses = await storage.getAllCourses();
  if (courses.length === 0) {
    const cs = await storage.createCourse({
      name: "Computer Science",
      description: "Bachelor of Science in Computer Science",
    });
    
    const business = await storage.createCourse({
      name: "Business Administration",
      description: "Bachelor of Science in Business Administration",
    });

    console.log("✓ Sample courses created");

    // Create sample sections
    await storage.createSection({
      courseId: cs.id,
      name: "Section A",
    });
    
    await storage.createSection({
      courseId: cs.id,
      name: "Section B",
    });

    await storage.createSection({
      courseId: business.id,
      name: "Section 1",
    });

    console.log("✓ Sample sections created");
  } else {
    console.log("✓ Sample data already exists");
  }

  console.log("\nDatabase seeded successfully!");
  console.log("\nLogin with:");
  console.log("  Admin: admin@attendance.com / admin123");
  
  process.exit(0);
}

seed().catch(console.error);
