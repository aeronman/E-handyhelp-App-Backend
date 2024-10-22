const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const axios = require("axios"); // For making HTTP requests

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: "50mb" })); // Adjust the size as needed
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

const PORT = process.env.PORT || 3000;

// MongoDB connection
const dbURI =
  "mongodb+srv://my_database:6mAaP61jyT04DiFU@atlascluster.5hsvgm6.mongodb.net/e_handy_help?retryWrites=true&w=majority&appName=AtlasCluster";

mongoose
  .connect(dbURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB Atlas");
  })
  .catch((error) => {
    console.error("Connection error:", error);
  });

const userSchema = new mongoose.Schema(
  {
    fname: {
      type: String,
      required: true,
    },
    lname: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true, // Ensure usernames are unique
    },
    password: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    contact: {
      type: String,
      required: true,
    },
    images: {
      type: [String],
      default: [],
    },
    dataPrivacyConsent: {
      type: Boolean,
      required: true,
    },
    accounts_status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    otp_fp: {
      type: String, // Store the OTP as a string
      default: null, // Default to null if not set
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);

// Chat Schema
const chatSchema = new mongoose.Schema({
  booking_id: String,
  handyman_id: String,
  user_id: String,
  sender: String,
  contents: String,
  date_sent: { type: Date, default: Date.now },
});

const Chat = mongoose.model("Chat", chatSchema);

// Notification Schema
const notificationSchema = new mongoose.Schema({
  handymanId: String,
  userId: String,
  notification_content: String,
  date_sent: { type: Date, default: Date.now },
  notif_for: String,
});

const Notification = mongoose.model("Notification", notificationSchema);

const ContactAdminSchema = new mongoose.Schema({
  userId: {
    type: String, // Adjust type if needed, depending on how your IDs are formatted
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  details: {
    type: String,
    required: true,
  },
  dateSent: {
    type: Date,
    default: Date.now,
  },
});

const ContactAdmin = mongoose.model("ContactAdmin", ContactAdminSchema);

app.post("/register", async (req, res) => {
  const {
    fname,
    lname,
    username,
    password,
    dateOfBirth,
    contact,
    address,
    images,
    dataPrivacyConsent,
  } = req.body;

  // Validate required fields
  if (
    !fname ||
    !lname ||
    !username ||
    !password ||
    !dateOfBirth ||
    !contact ||
    !dataPrivacyConsent
  ) {
    return res.status(400).send("Missing required fields");
  }

  // Log incoming request data
  console.log("Incoming registration request:", {
    fname,
    lname,
    username,
    dateOfBirth,
    contact,
    address,
    dataPrivacyConsent,
  });

  try {
    // Password hashing
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Hashed password:", hashedPassword);

    const user = new User({
      fname,
      lname,
      username,
      password: hashedPassword,
      dateOfBirth,
      contact,
      address,
      images,
      dataPrivacyConsent,
    });

    // Log before saving to the database
    console.log("Attempting to save user to the database:", user);

    // Save the new user to the database
    await user.save();

    // Log successful registration
    console.log(`User registered successfully: ${username}`);

    res.status(201).send("User registered successfully");
  } catch (error) {
    // Log the error for debugging
    console.error("Error registering user:", error.message);
    console.error("Complete error object:", error);

    // Handle specific validation errors
    if (error.name === "ValidationError") {
      return res.status(400).send("Validation error: " + error.message);
    }

    // Send a generic error message back to the client
    res.status(500).send("Error registering user");
  }
});

// Handyman schema and model
// Define the Handyman Schema
const handymanSchema = new mongoose.Schema(
  {
    fname: {
      type: String,
      required: true,
    },
    lname: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true, // Ensure unique usernames
    },
    password: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    contact: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    specialization: {
      type: [String], // Array of strings
      required: true,
    },
    idImages: {
      type: [String], // Array of strings for image paths
      default: [],
    },
    certificatesImages: {
      type: [String], // Array of strings for certificate image paths
      default: [],
    },
    dataPrivacyConsent: {
      type: Boolean,
      default: false,
    },
    accounts_status: {
      type: String,
      enum: ["pending", "verified", "rejected", "suspended"], // Possible statuses
      default: "pending", // Default to pending
    },
    otp_fp: {
      type: String, // Store the OTP as a string
      default: null, // Default to null if not set
    },
  },
  {
    timestamps: true, // Automatically create createdAt and updatedAt fields
  },
);

const Handyman = mongoose.model("Handyman", handymanSchema);

app.get("/", (req, res) => {
  res.send("Hello, World!");
});
// Get all verified handymen
app.get("/profiles", async (req, res) => {
  try {
    // Fetch only handymen with account_status set to 'verified'
    const profiles = await Handyman.find({ accounts_status: "verified" });
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// Register handyman route
app.post("/register-handyman", async (req, res) => {
  const {
    fname,
    lname,
    username,
    password,
    dateOfBirth,
    contact,
    address,
    specialization,
    idImages,
    certificatesImages,
    dataPrivacyConsent,
  } = req.body;

  // Password hashing
  const hashedPassword = await bcrypt.hash(password, 10);

  const handyman = new Handyman({
    fname,
    lname,
    username,
    password: hashedPassword,
    dateOfBirth,
    contact,
    address,
    specialization,
    idImages,
    certificatesImages,
    dataPrivacyConsent,
  });

  try {
    await handyman.save();
    res.status(201).send("Handyman registered successfully");
  } catch (error) {
    res.status(500).send("Error registering handyman");
  }
});

// Login endpoint
app.post("/login-handyman", async (req, res) => {
  const { username, password } = req.body; // Removed fname and lname from here

  console.log("Login attempt:", { username }); // Log the attempt to login

  try {
    // Check if handyman exists
    const handyman = await Handyman.findOne({ username });
    if (!handyman) {
      console.warn(`Login failed: Invalid username - ${username}`); // Log warning for invalid username
      return res.status(400).json({ message: "Invalid username or password" });
    }

    // Check if password is correct
    const isMatch = await bcrypt.compare(password, handyman.password);
    if (!isMatch) {
      console.warn(`Login failed: Invalid password for username - ${username}`); // Log warning for invalid password
      return res.status(400).json({ message: "Invalid username or password" });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: handyman._id }, "secret_key", {
      expiresIn: "1h",
    });

    // Log successful login
    console.log(
      `Login successful for user: ${username}, Handyman ID: ${handyman._id}`,
    ); // Log successful login

    // Send handyman data along with the token
    res.json({
      token,
      handyman: {
        id: handyman._id,
        fname: handyman.fname,
        lname: handyman.lname,
        username: handyman.username,
        dateOfBirth: handyman.dateOfBirth,
        contact: handyman.contact,
        address: handyman.address,
        specialization: handyman.specialization,
        idImages: handyman.idImages,
        certificatesImages: handyman.certificatesImages,
        dataPrivacyConsent: handyman.dataPrivacyConsent,
        accounts_status: handyman.accounts_status,
      },
    });
  } catch (error) {
    console.error("Error during login:", error); // Log any server error
    res.status(500).json({ message: "Server error" });
  }
});

// Function to format date
const formatDate = (date) => {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(date).toLocaleDateString(undefined, options); // Format the date to "Month Day, Year"
};

app.get("/requested-profiles", async (req, res) => {
  try {
    // Get handymanId from the query parameters
    const handymanId = req.query.handymanId;

    // Find bookings where handymanId matches and status is requested
    const bookings = await Booking.find({
      handymanId,
      status: "requested",
    }).populate("userId");

    const profiles = await Promise.all(
      bookings.map(async (booking) => {
        const user = await User.findById(booking.userId);
        return {
          bookingId: booking._id,
          userId: user._id,
          name: `${user.fname} ${user.lname}`,
          address: user.address,
          contact: user.contact,
          serviceDetails: booking.serviceDetails,
          dateOfService: formatDate(booking.dateOfService),
          serviceImages: booking.images,
          images: user.images || "default_image.png",
        };
      }),
    );

    res.status(200).json(profiles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Login endpoint
// Login endpoint
app.post("/login-user", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Log the incoming request body
    console.log("Login request body:", req.body);

    // Check if user exists
    const user = await User.findOne({ username });
    if (!user) {
      console.log("User not found:", username);
      return res.status(400).json({ message: "Invalid username or password" });
    }

    // Log user information
    console.log("User found:", user);

    // Check if password is correct
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("Password mismatch for user:", username);
      return res.status(400).json({ message: "Invalid username or password" });
    }

    // Log password match success
    console.log("Password match successful for user:", username);

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, "secret_key", {
      expiresIn: "1h",
    });

    // Log the token generation success
    console.log("JWT token generated for user:", username);

    // Return the token and user data including _id
    res.json({
      token,
      user: {
        _id: user._id,
        username: username,
        fname: user.fname,
        lname: user.lname,
        email: user.email,
        contact: user.contact,
        dateOfBirth: user.dateOfBirth,
        images: user.images,
        accounts_status: user.accounts_status,
      },
    });
  } catch (error) {
    // Log the error with detailed message
    console.error("Server error during login:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Booking Schema
const bookingSchema = new mongoose.Schema({
  userId: String,
  handymanId: String,
  serviceDetails: String,
  dateOfService: Date,
  urgentRequest: Boolean,
  images: [String], // Base64 images
  status: String,
});

const Booking = mongoose.model("Booking", bookingSchema);

// POST route to handle booking requests
app.post("/api/bookings", async (req, res) => {
  const {
    userId,
    handymanId,
    serviceDetails,
    dateOfService,
    urgentRequest,
    images,
    status = "requested",
  } = req.body;

  try {
    // Create a new booking
    const newBooking = new Booking({
      userId,
      handymanId,
      serviceDetails,
      dateOfService,
      urgentRequest,
      images,
      status,
    });

    // Save the booking
    await newBooking.save();

    // Create a notification for the handyman
    const notificationContent = `You have a new booking request for the service: ${serviceDetails}.`;

    const newNotification = new Notification({
      handymanId,
      userId,
      notification_content: notificationContent,
      notif_for: "handyman", // Specify that this notification is for handymen
    });

    // Save the notification
    await newNotification.save();

    // Send response
    res.status(200).json({ message: "Booking request saved successfully" });
  } catch (error) {
    console.error("Error saving booking:", error);
    res.status(500).json({ message: "Error saving booking request" });
  }
});

app.get("/bookings", async (req, res) => {
  const handymanId = req.query.handymanId;
  const status = req.query.status;

  try {
    const bookings = await Booking.find({
      handymanId: handymanId,
      status: status,
    });

    // Prepare an array to hold bookings with user details
    const bookingsWithUserDetails = await Promise.all(
      bookings.map(async (booking) => {
        try {
          // Fetch user data based on userId
          const user = await User.findById(booking.userId).select(
            "fname lname",
          );
          return {
            ...booking._doc, // Spread operator to copy existing booking data
            bookerFirstName: user ? user.fname : "Unknown", // Default to 'Unknown' if user not found
            bookerLastName: user ? user.lname : "Unknown",
          };
        } catch (userErr) {
          console.error("Error fetching user details:", userErr);
          return {
            ...booking._doc,
            bookerFirstName: "Unknown",
            bookerLastName: "Unknown",
          };
        }
      }),
    );

    res.status(200).json(bookingsWithUserDetails);
  } catch (err) {
    console.error("Error fetching bookings:", err); // Log the error details
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

app.get("/bookings-user", async (req, res) => {
  const userId = req.query.userId;
  const status = req.query.status;

  try {
    const bookings = await Booking.find({
      userId: userId,
      status: status,
    });

    // Prepare an array to hold bookings with user details
    const bookingsWithUserDetails = await Promise.all(
      bookings.map(async (booking) => {
        try {
          // Fetch user data based on userId
          const user = await Handyman.findById(booking.handymanId).select(
            "fname lname",
          );
          return {
            ...booking._doc, // Spread operator to copy existing booking data
            bookerFirstName: user ? user.fname : "Unknown", // Default to 'Unknown' if user not found
            bookerLastName: user ? user.lname : "Unknown",
          };
        } catch (userErr) {
          console.error("Error fetching user details:", userErr);
          return {
            ...booking._doc,
            bookerFirstName: "Unknown",
            bookerLastName: "Unknown",
          };
        }
      }),
    );

    res.status(200).json(bookingsWithUserDetails);
  } catch (err) {
    console.error("Error fetching bookings:", err); // Log the error details
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// Accept booking and send chat and notification
app.post("/accept-booking", async (req, res) => {
  const {
    handymanId,
    userId,
    bookingId,
    serviceDetails,
    name,
    contact,
    address,
    dateOfService,
  } = req.body;

  try {
    // Save auto-generated chat message
    const chatContent = `This is an auto-generated chat. Hi ${name}, I have accepted your booking for ${serviceDetails}. Please confirm if the following details are correct:\nName: ${name},\nContact: ${contact},\nAddress: ${address},\nBooking Date: ${dateOfService}\nThank you!`;

    const newChat = new Chat({
      booking_id: bookingId,
      handyman_id: handymanId,
      sender: "handy",
      user_id: userId,
      contents: chatContent,
    });
    await newChat.save();

    // Save notification
    const notification = new Notification({
      handymanId,
      userId,
      notification_content: "Accepted your booking!",
      notif_for: "user",
    });
    await notification.save();

    // Update booking status based on bookingId
    await Booking.findOneAndUpdate(
      { _id: bookingId }, // Use bookingId to find the booking
      { status: "accepted" },
      { new: true },
    );

    res
      .status(200)
      .json({ message: "Booking accepted, chat and notification sent." });
  } catch (error) {
    console.error(error); // Log error for debugging
    res.status(500).json({ error: "Failed to accept booking." });
  }
});

// Decline booking and send notification
app.post("/decline-booking", async (req, res) => {
  const { handymanId, userId, bookingId } = req.body; // Accept bookingId

  try {
    // Save notification
    const notification = new Notification({
      handymanId,
      userId,
      notification_content: "Your booking has been declined!",
    });
    await notification.save();

    // Update booking status based on bookingId
    await Booking.findOneAndUpdate(
      { _id: bookingId }, // Use bookingId to find the booking
      { status: "declined" },
      { new: true },
    );

    res.status(200).json({ message: "Booking declined, notification sent." });
  } catch (error) {
    console.error(error); // Log error for debugging
    res.status(500).json({ error: "Failed to decline booking." });
  }
});

const ObjectId = mongoose.Types.ObjectId; // Mongoose's ObjectId constructor

// Endpoint to fetch messages grouped by booking_id
app.get("/api/messages", async (req, res) => {
  try {
    // Extract handymanId from query parameters
    const handymanId = req.query.handymanId;
    console.log(handymanId);
    // Validate handymanId
    if (!handymanId) {
      return res.status(400).json({ message: "handymanId is required" });
    }

    // Ensure handymanId is a valid ObjectId
    if (!ObjectId.isValid(handymanId)) {
      return res.status(400).json({ message: "Invalid handymanId format" });
    }

    const messages = await Chat.aggregate([
      {
        $match: {
          handyman_id: handymanId, // Filter by handymanId
        },
      },
      {
        $group: {
          _id: {
            user_id: { $toObjectId: "$user_id" }, // Convert user_id to ObjectId
            handyman_id: "$handyman_id",
            booking_id: "$booking_id",
          },
          last_message: { $last: "$contents" },
          date_sent: { $last: "$date_sent" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id.user_id",
          foreignField: "_id", // Assuming user_id in users collection is an ObjectId
          as: "user_details",
        },
      },
      {
        $unwind: {
          path: "$user_details",
          preserveNullAndEmptyArrays: true, // Preserve documents with no user details
        },
      },
      {
        $project: {
          user_id: "$_id.user_id",
          handyman_id: "$_id.handyman_id",
          booking_id: "$_id.booking_id",
          last_message: { $substr: ["$last_message", 0, 25] }, // Adjust length if necessary
          userFirstName: "$user_details.fname",
          userLastName: "$user_details.lname",
          date_sent: "$date_sent",
        },
      },
      { $sort: { date_sent: -1 } }, // Sort messages by date_sent in descending order
    ]);

    // Handle empty results
    if (!messages.length) {
      return res.status(404).json({ message: "No messages found" });
    }

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error); // Log the error for debugging
    res.status(500).json({ error: "Error fetching messages" });
  }
});

app.get("/api/conversation/:bookingId", async (req, res) => {
  const bookingId = req.params.bookingId;
  try {
    // Perform aggregation to fetch the conversation with user details
    const conversation = await Chat.aggregate([
      {
        $match: { booking_id: bookingId },
      },
      {
        $addFields: {
          user_id: { $toObjectId: "$user_id" }, // Convert user_id to ObjectId
        },
      },
      {
        $lookup: {
          from: "users", // Name of the users collection
          localField: "user_id", // user_id from the chats collection
          foreignField: "_id", // _id in the users collection
          as: "user_details", // Alias for the lookup results
        },
      },
      {
        $unwind: {
          path: "$user_details",
          preserveNullAndEmptyArrays: true, // Preserve chat messages with no user details
        },
      },
      {
        $sort: { date_sent: 1 }, // Sort the conversation by date_sent
      },
      {
        $project: {
          handyman_id: 1,
          user_id: 1,
          contents: 1,
          date_sent: 1,
          sender: 1,
          "user_details.fname": 1,
          "user_details.lname": 1,
          booking_id: 1,
        },
      },
    ]);

    res.json(conversation);
  } catch (error) {
    console.error("Error fetching conversation:", error);
    res.status(500).json({ error: "Error fetching conversation" });
  }
});

// Endpoint to send/save a message
app.post("/api/send-message", async (req, res) => {
  const { contents, handyman_id, user_id, booking_id } = req.body;

  if (!contents || !handyman_id || !user_id || !booking_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Create a new message
    const newMessage = new Chat({
      contents,
      handyman_id,
      user_id,
      booking_id,
      sender: "handy", // Assuming it's the handyman sending the message
    });

    // Save the message in the database
    await newMessage.save();

    // Optionally, you can fetch the related user details here if needed
    // and include that in the response if you want to display it immediately

    res.status(200).json(newMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Get user notifications
app.get("/api/notifications/:userId", async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.params.userId,
      notif_for: "user", // Added filter for notif_for
    });

    const notificationsWithDetails = await Promise.all(
      notifications.map(async (notification) => {
        const handyman = await Handyman.findById(notification.handymanId);
        return {
          title: notification.notification_content,
          description: `${handyman.fname} ${handyman.lname} ${notification.notification_content}`,
          date: notification.date_sent,
        };
      }),
    );

    res.json(notificationsWithDetails);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Get all notifications for a specific handyman
app.get("/api/handynotifications/:handymanId", async (req, res) => {
  try {
    // Fetch notifications where 'notif_for' is 'handyman' and matching handyman ID
    const notifications = await Notification.find({
      handymanId: req.params.handymanId,
      notif_for: "handyman",
    });

    // Populate handyman details for each notification
    const notificationsWithDetails = await Promise.all(
      notifications.map(async (notification) => {
        const user = await User.findById(notification.userId);
        return {
          title: notification.notification_content,
          description: `${user.fname} ${user.lname} - ${notification.notification_content}`,
          date: notification.date_sent,
        };
      }),
    );

    res.json(notificationsWithDetails);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Endpoint to fetch messages grouped by booking_id
app.get("/api/user-messages", async (req, res) => {
  try {
    // Extract handymanId from query parameters
    const userId = req.query.userId;

    // Validate handymanId
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // Ensure handymanId is a valid ObjectId
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId format" });
    }

    const messages = await Chat.aggregate([
      {
        $match: {
          user_id: userId, // Filter by userId
        },
      },
      {
        $group: {
          _id: {
            user_id: { $toObjectId: "$user_id" }, // Convert user_id to ObjectId
            handyman_id: { $toObjectId: "$handyman_id" },
            booking_id: "$booking_id",
          },
          last_message: { $last: "$contents" },
          date_sent: { $last: "$date_sent" },
        },
      },
      {
        $lookup: {
          from: "handymen",
          localField: "_id.handyman_id",
          foreignField: "_id", // Assuming user_id in users collection is an ObjectId
          as: "handyMan_details",
        },
      },
      {
        $unwind: {
          path: "$handyMan_details",
          preserveNullAndEmptyArrays: true, // Preserve documents with no user details
        },
      },
      {
        $project: {
          user_id: "$_id.user_id",
          handyman_id: "$_id.handyman_id",
          booking_id: "$_id.booking_id",
          last_message: { $substr: ["$last_message", 0, 25] }, // Adjust length if necessary
          userFirstName: "$handyMan_details.fname",
          userLastName: "$handyMan_details.lname",
          date_sent: "$date_sent",
        },
      },
      { $sort: { date_sent: -1 } }, // Sort messages by date_sent in descending order
    ]);

    // Handle empty results
    if (!messages.length) {
      return res.status(404).json({ message: "No messages found" });
    }

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error); // Log the error for debugging
    res.status(500).json({ error: "Error fetching messages" });
  }
});

app.get("/api/user-conversation/:bookingId", async (req, res) => {
  const bookingId = req.params.bookingId;
  try {
    // Perform aggregation to fetch the conversation with user details
    const conversation = await Chat.aggregate([
      {
        $match: { booking_id: bookingId },
      },
      {
        $addFields: {
          handyman_id: { $toObjectId: "$handyman_id" }, // Convert user_id to ObjectId
        },
      },
      {
        $lookup: {
          from: "handymen", // Name of the users collection
          localField: "handyman_id", // user_id from the chats collection
          foreignField: "_id", // _id in the users collection
          as: "handyMan_details", // Alias for the lookup results
        },
      },
      {
        $unwind: {
          path: "$handyMan_details",
          preserveNullAndEmptyArrays: true, // Preserve chat messages with no user details
        },
      },
      {
        $sort: { date_sent: 1 }, // Sort the conversation by date_sent
      },
      {
        $project: {
          handyman_id: 1,
          user_id: 1,
          contents: 1,
          date_sent: 1,
          sender: 1,
          "handyMan_details.fname": 1,
          "handyMan_details.lname": 1,
          booking_id: 1,
        },
      },
    ]);

    res.json(conversation);
  } catch (error) {
    console.error("Error fetching conversation:", error);
    res.status(500).json({ error: "Error fetching conversation" });
  }
});

// Endpoint to send/save a message
app.post("/api/send-message-user", async (req, res) => {
  const { contents, handyman_id, user_id, booking_id } = req.body;

  if (!contents || !handyman_id || !user_id || !booking_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Create a new message
    const newMessage = new Chat({
      contents,
      handyman_id,
      user_id,
      booking_id,
      sender: "user", // Assuming it's the handyman sending the message
    });

    // Save the message in the database
    await newMessage.save();

    // Optionally, you can fetch the related user details here if needed
    // and include that in the response if you want to display it immediately

    res.status(200).json(newMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

const ReportSchema = new mongoose.Schema({
  handymanId: { type: String, required: true },
  userId: { type: String, required: true },
  reportReason: { type: String, required: true },
  reported_by: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, default: "pending" },
  additionalInfo: {
    workDescription: { type: String, required: true },
    dateReported: { type: Date, default: Date.now },
  },
});
const Report = mongoose.model("Report", ReportSchema);

app.post("/reports", async (req, res) => {
  try {
    const { bookingId, reason, reported_by } = req.body;

    // Validate input
    if (!bookingId || !reason) {
      return res
        .status(400)
        .json({ message: "Booking ID and reason are required" });
    }

    // Find the booking to get the userId, handymanId, and serviceDetails
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      console.error(`Booking not found for ID: ${bookingId}`); // Log specific error
      return res.status(404).json({ message: "Booking not found" });
    }

    // Create the report using the retrieved booking information
    const report = new Report({
      handymanId: booking.handymanId, // Get handymanId from the booking
      userId: booking.userId, // Get userId from the booking
      reportReason: reason,
      timestamp: new Date(),
      status: "pending",
      reported_by: reported_by, // Default status
      additionalInfo: {
        workDescription: booking.serviceDetails, // Get serviceDetails as workDescription
        dateReported: new Date(), // Set date reported
      },
    });

    await report.save();
    console.log(`Report created successfully for booking ID: ${bookingId}`); // Log success

    // Determine who the notification is for based on who reported
    let notif_for;
    if (reported_by === "handyman") {
      notif_for = "user"; // If reported by handyman, notif_for should be user
    } else if (reported_by === "user") {
      notif_for = "handyman"; // If reported by user, notif_for should be handyman
    } else {
      return res.status(400).json({ message: "Invalid reporter type" });
    }

    // Create the notification
    const notification = new Notification({
      handymanId: booking.handymanId, // Get handymanId from the booking
      userId: booking.userId, // Get userId from the booking
      notification_content: `You have been reported by a ${reported_by}!`, // Notification content
      notif_for: notif_for, // Who the notification is for (based on above logic)
      date_sent: new Date(), // Current date
    });

    await notification.save(); // Save the notification
    console.log(
      `Notification created successfully for ${notif_for} based on report by ${reported_by}`,
    );

    res.status(201).json(report);
  } catch (error) {
    console.error("Error in POST /reports:", error); // Log the full error
    res
      .status(500)
      .json({ message: "Error reporting booking", error: error.message });
  }
});

// Mark Booking as Completed
app.patch("/bookings/:id/complete", async (req, res) => {
  try {
    const { id } = req.params;

    // Find the booking to get the handymanId
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Update the booking status to completed
    booking.status = "completed";
    await booking.save();

    res.status(200).json(booking);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error marking booking as completed", error });
  }
});

const feedbackSchema = new mongoose.Schema(
  {
    handymanId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Handyman", // Reference to the Handyman collection
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User", // Reference to the User collection
    },
    feedbackText: {
      type: String,
      required: true,
      trim: true, // Trim whitespace from feedback text
    },
    rating: {
      type: Number,
      required: true,
      min: 1, // Assuming rating is between 1 and 5
      max: 5,
    },
    sent_by: {
      type: String,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  },
);

const Feedback = mongoose.model("Feedback", feedbackSchema);

app.post("/feedback", async (req, res) => {
  try {
    const { bookingId, rating, feedbackText, sentBy } = req.body;

    // Find the booking to get handymanId and userId
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Create and save the feedback
    const feedback = new Feedback({
      handymanId: booking.handymanId,
      userId: booking.userId,
      rating, // rating is a number (e.g., 1-5 stars)
      feedbackText,
      sent_by: sentBy,
      timestamp: new Date(),
    });

    await feedback.save();

    // Determine who the notification is for based on who sent the feedback
    let notif_for;
    if (sentBy === "handyman") {
      notif_for = "user"; // If feedback is sent by handyman, notif_for should be user
    } else if (sentBy === "user") {
      notif_for = "handyman"; // If feedback is sent by user, notif_for should be handyman
    } else {
      return res.status(400).json({ message: "Invalid sender type" });
    }

    // Create a notification for the corresponding party
    const notification = new Notification({
      handymanId: booking.handymanId, // Get handymanId from the booking
      userId: booking.userId, // Get userId from the booking
      notification_content: `A ${sentBy} has given you feedback.`, // Notification content
      notif_for: notif_for, // Who the notification is for (based on above logic)
      date_sent: new Date(), // Current date
    });

    await notification.save(); // Save the notification
    console.log(
      `Notification created successfully for ${notif_for} based on feedback from ${sentBy}`,
    );

    res
      .status(201)
      .json({ message: "Feedback submitted successfully", feedback });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res
      .status(500)
      .json({ message: "Error submitting feedback", error: error.message });
  }
});

// Define the API endpoint to get feedback for a handyman
app.get("/feedbacks", async (req, res) => {
  const { handymanId } = req.query;

  if (!handymanId) {
    return res.status(400).json({ error: "handymanId is required" });
  }

  try {
    // Find all feedbacks for the handyman where sent_by is "user" and populate userId with fname and lname
    const feedbacks = await Feedback.find({ handymanId, sent_by: "user" }) // Added filter for sent_by
      .populate("userId", "fname lname") // Assuming userId references a User document
      .exec();

    // Calculate the total feedback count
    const feedbackCount = feedbacks.length;

    // Calculate the average rating
    const totalRating = feedbacks.reduce(
      (sum, feedback) => sum + feedback.rating,
      0,
    );
    const averageRating = feedbackCount > 0 ? totalRating / feedbackCount : 0;

    // Format the feedback list with user details
    const formattedFeedbacks = feedbacks.map((feedback) => ({
      userId: feedback.userId._id,
      feedbackText: feedback.feedbackText,
      rating: feedback.rating,
      userName: `${feedback.userId.fname} ${feedback.userId.lname}`, // Full name
    }));

    // Send the response
    res.status(200).json({
      feedbackCount,
      averageRating: averageRating.toFixed(1), // Round to one decimal
      feedbacks: formattedFeedbacks, // Include the detailed feedback list
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Generate a random 4-digit OTP
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString(); // Returns a string
};

// Send OTP to phone number
const sendOTP = async (phoneNumber, otp) => {
  const apiKey = "6ce2d9ac9d5da878b0a9bb7b62aaddc5";
  const apiUrl = "https://semaphore.co/api/v4/messages";

  try {
    const response = await axios.post(
      apiUrl,
      {
        apikey: apiKey,
        number: phoneNumber,
        message: `Your OTP is: ${otp}`,
        sendername: "Thesis",
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    return response.data; // Response from Semaphore API
  } catch (error) {
    console.error("Error sending OTP:", error);
    throw new Error("Failed to send OTP");
  }
};

// API to submit phone number and send OTP
app.post("/send-otp", async (req, res) => {
  const { phoneNumber } = req.body;

  try {
    // Generate the OTP
    const otp = generateOTP();

    // Find user or handyman by phone number
    const user = await User.findOne({ contact: phoneNumber });
    const handyman = await Handyman.findOne({ contact: phoneNumber });

    if (!user && !handyman) {
      return res
        .status(404)
        .json({ message: "No account found with this phone number." });
    }

    // Save the OTP to the user's or handyman's otp_fp field
    if (user) {
      user.otp_fp = otp; // Save the OTP in the user schema
      await user.save();
    } else if (handyman) {
      handyman.otp_fp = otp; // Save the OTP in the handyman schema
      await handyman.save();
    }

    // Send the OTP to the phone number
    await sendOTP(phoneNumber, otp);

    // Respond with the OTP (for comparison in the UI)
    res.status(200).json({ otp }); // Optionally, you can send back a success message instead of the OTP for security reasons
  } catch (error) {
    console.error("Error in /send-otp:", error);
    res
      .status(500)
      .json({ message: "Error sending OTP", error: error.message });
  }
});

app.post("/verify-otp", async (req, res) => {
  const { phoneNumber, otp } = req.body; // Using contact from the request body
  console.log(phoneNumber);
  console.log(otp);
  try {
    // Search in handymen collection with contact field
    let user = await Handyman.findOne({ contact: phoneNumber }); // Ensure contact field is used

    if (!user) {
      // If not found, search in user collection with contact field
      user = await User.findOne({ contact: phoneNumber }); // Ensure contact field is used
    }

    if (!user) {
      return res.status(404).json({ message: "Contact number not found" }); // Updated message
    }

    // Check if OTP is valid and not expired
    const currentTime = new Date();
    if (user.otp_fp === otp) {
      return res.status(200).json({ userId: user._id });
    } else {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
});

app.post("/contact-admin", async (req, res) => {
  const { userId, subject, details } = req.body;

  if (!userId || !subject || !details) {
    return res
      .status(400)
      .json({ error: "User ID, subject, and details are required" });
  }

  try {
    // Create a new contact admin entry
    const newContactAdmin = new ContactAdmin({
      userId, // Save userId
      subject,
      details,
    });

    await newContactAdmin.save();
    return res.status(200).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to send message" });
  }
});
// Password Reset Endpoint
app.post("/reset-password/:userId", async (req, res) => {
  const { newPassword } = req.body;
  const { userId } = req.params;

  try {
    // Check if userId exists in the Handyman collection
    let user = await Handyman.findById(userId);

    if (!user) {
      // If not found in Handyman, check in User collection
      user = await User.findById(userId);
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    user.password = hashedPassword; // Assuming password field exists
    await user.save();

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
