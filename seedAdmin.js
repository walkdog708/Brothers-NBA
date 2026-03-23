require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

require("./models/User");

const User = mongoose.model("User");

async function run() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("Missing MONGO_URI in .env");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const username = "admin";
    const plainPassword = "brothers123";
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const existing = await User.findOne({ username });

    if (existing) {
      existing.passwordHash = passwordHash;
      existing.firstName = "Admin";
      existing.lastName = "User";
      existing.email = "";
      existing.isAdmin = true;
      existing.isActive = true;
      existing.mustChangePassword = false;
      await existing.save();

      console.log("Updated existing admin user");
    } else {
      await User.create({
        username,
        passwordHash,
        firstName: "Admin",
        lastName: "User",
        email: "",
        isAdmin: true,
        isActive: true,
        mustChangePassword: false
      });

      console.log("Created admin user");
    }

    console.log("Username: admin");
    console.log("Password: brothers123");
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

run();