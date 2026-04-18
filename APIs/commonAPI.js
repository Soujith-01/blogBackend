import exp from "express";
import { userModel } from "../models/userModel.js";
import { hash, compare } from "bcryptjs";
import { config } from "dotenv";
import jwt from "jsonwebtoken";
import { verifyToken } from "../middlewares/verifyToken.js";
const { sign } = jwt;
export const commonApp = exp.Router();
import { upload } from "../config/multer.js";
import { uploadToCloudinary } from "../config/cloudinaryUpload.js";
import cloudinary, { isCloudinaryConfigured } from "../config/cloudinary.js";
config();

const getCookieOptions = (req) => {
  const isSecure = req.secure || req.get("x-forwarded-proto") === "https";

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? "none" : "lax",
    path: "/",
  };
};

//Route for register
commonApp.post("/users", upload.single("profileImageUrl"), async (req, res, next) => {
  let cloudinaryResult;
  try {
    let allowedRoles = ["USER", "AUTHOR"];
    //get user from req
    const newUser = req.body;
    newUser.email = String(newUser.email || "").trim().toLowerCase();
    console.log(newUser);
    console.log(req.file);

    //check role
    if (!allowedRoles.includes(newUser.role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    //Upload image to cloudinary from memoryStorage
    if (req.file) {
      if (!isCloudinaryConfigured) {
        return res.status(500).json({
          error: "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in backend .env",
        });
      }
      cloudinaryResult = await uploadToCloudinary(req.file.buffer);
    }

    // console.log("cloudinaryResult", cloudinaryResult);
    //add CDN link(secure_url) of image to newUserObj
    newUser.profileImageUrl = cloudinaryResult?.secure_url;

    //run validators manually
    //hash password and replace plain with hashed one
    newUser.password = await hash(newUser.password, 12);

    //create New user document
    const newUserDoc = new userModel(newUser);

    //save document
    await newUserDoc.save();
    //send res
    res.status(201).json({ message: "User created" });
  } catch (err) {
    console.log("err is ", err);
    //delete image from cloudinary
    if (cloudinaryResult?.public_id) {
      try {
        await cloudinary.uploader.destroy(cloudinaryResult.public_id);
      } catch (cleanupErr) {
        console.log("cloudinary cleanup failed", cleanupErr.message);
      }
    }
    next(err);
  }
});

//Route for Login(USER, AUTHOR and ADMIN)
commonApp.post("/login", async (req, res) => {
  //console.log(req.body)
  //get user cred obj
  const { email, password } = req.body;
  const emailInput = String(email || "").trim().toLowerCase();
  const passwordInput = String(password || "");
  //find user by email
  const user = await userModel.findOne({ email: emailInput });
  //if use not found
  if (!user) {
    return res.status(400).json({ message: "Account not found. Please register first." });
  }
  //compare password
  let isMatched = await compare(passwordInput, user.password);
  //fallback for ADMIN login via .env credentials and resync hash in DB
  if (!isMatched && user.role === "ADMIN") {
    const envAdminEmail = process.env.ADMIN_EMAIL?.trim();
    const envAdminPassword = process.env.ADMIN_PASSWORD?.trim();
    if (envAdminEmail && envAdminPassword && emailInput === envAdminEmail.toLowerCase() && passwordInput === envAdminPassword) {
      user.password = await hash(passwordInput, 12);
      await user.save();
      isMatched = true;
    }
  }
  //if passwords not matched
  if (!isMatched) {
    return res.status(400).json({ message: "Invalid password" });
  }
  //inactive users/authors are not allowed to log in
  if (user.role !== "ADMIN" && !user.isUserActive) {
    return res.status(403).json({ message: "Account is inactive. Contact admin." });
  }
  //create jwt
  const signedToken = sign(
    {
      id: user._id,
      email: emailInput,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
    },
    process.env.SECRET_KEY,
    {
      expiresIn: "1h",
    },
  );

  //set token to res header as httpOnly cookie
  res.cookie("token", signedToken, getCookieOptions(req));
  //remove password from user document
  let userObj = user.toObject();
  delete userObj.password;

  //send res
  res.status(200).json({ message: "login success", payload: userObj });
});

//Route for Logout
commonApp.get("/logout", (req, res) => {
  //delete token from cookie storage
  res.clearCookie("token", getCookieOptions(req));
  //send res
  res.status(200).json({ message: "Logout success" });
});

//Page refresh
commonApp.get("/check-auth", verifyToken("USER", "AUTHOR", "ADMIN"), (req, res) => {
  res.status(200).json({
    message: "authenticated",
    payload: req.user,
  });
});

//Change password
commonApp.put("/password", verifyToken("USER", "AUTHOR", "ADMIN"), async (req, res) => {
  //check current password and new password are same
  //get current password of user/admin/author
  //check the current password of req and user are not same
  // hash new password
  //replace current password of user with hashed new password
  //save
  //send res
});