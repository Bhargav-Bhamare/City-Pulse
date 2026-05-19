const express = require("express");
const app = express();
const port = 8080;
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const methodOverride = require("method-override");
const multer = require("multer");





app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Add JSON parsing for API routes

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(methodOverride("_method"));

// configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/"); // make sure /public/uploads exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

let posts = [
  {
    id: uuidv4(),
    upvotes: 20,
    reports: 2,
    heading: "Pothole Issue",
    info: "Large pothole blocking traffic near Main Street.",
    createdAt: new Date(),
    user: "Rajesh Sharma",
    photo: "/uploads/PothHoles.PNG",
    Lat: 19.0760,
    Lon: 72.8777,
    status: "pending"
  },
  {
    id: uuidv4(),
    upvotes: 56,
    reports: 1,
    heading: "Garbage Overflow",
    info: "Trash not collected for 3 days in Sector 5.",
    createdAt: new Date(),
    user: "Anonymous",
    photo: "/uploads/Trash.PNG",
    Lat: 19.0900,
    Lon: 72.8800,
    status: "in-progress"
  }
];

// Function to sanitize posts data for JSON output
function sanitizePostsForJSON(posts) {
  return posts.map(post => ({
    ...post,
    heading: post.heading ? post.heading.replace(/"/g, '\\"').replace(/\n/g, ' ') : '',
    info: post.info ? post.info.replace(/"/g, '\\"').replace(/\n/g, ' ') : '',
    user: post.user ? post.user.replace(/"/g, '\\"').replace(/\n/g, ' ') : '',
    createdAt: post.createdAt,
    Lat: post.Lat,
    Lon: post.Lon,
    id: post.id,
    upvotes: post.upvotes,
    reports: post.reports || 0,
    photo: post.photo
  }));
}

// routes
app.get("/", (req, res) => {
  console.log("👉 Sending posts to homepage:", posts.length, "posts"); // DEBUG
  const sanitizedPosts = sanitizePostsForJSON(posts);
  res.render("index.ejs", { posts: sanitizedPosts });
});

app.get("/new", (req, res) => {
  res.render("createPost.ejs");
});

// API route to get posts as JSON (for AJAX requests)
app.get("/api/posts", (req, res) => {
  console.log("📡 API: Sending posts data:", posts.length, "posts");
  const sanitizedPosts = sanitizePostsForJSON(posts);
  res.json(sanitizedPosts);
});

app.post("/", upload.single("photo"), (req, res) => {
  let { heading, info, user, Lat, Lon } = req.body;
  let id = uuidv4();
  let photo = req.file ? "/uploads/" + req.file.filename : "/default.png";

  // Convert Lat/Lon to numbers if provided
  const latNum = Lat && Lat.trim() !== "" ? parseFloat(Lat) : null;
  const lonNum = Lon && Lon.trim() !== "" ? parseFloat(Lon) : null;
  
  console.log("🔍 Processing new post coordinates:", {
    originalLat: Lat,
    originalLon: Lon,
    parsedLat: latNum,
    parsedLon: lonNum
  });

  const newPost = {
    id,
    upvotes: 0,
    reports: 0, // Initialize reports count
    heading,
    info,
    createdAt: new Date(),
    user: req.body.anonymous ? "Anonymous" : user,  // ✅ handle checkbox
    photo,
    Lat: latNum,
    Lon: lonNum,
    status: "pending" // Default status for new posts
  };

  posts.push(newPost);

  console.log("✅ New post added successfully:", {
    id: newPost.id,
    heading: newPost.heading,
    coordinates: `${newPost.Lat}, ${newPost.Lon}`,
    hasValidCoords: (newPost.Lat !== null && newPost.Lon !== null),
    totalPosts: posts.length
  });

  // Debug: Print all posts with their coordinates
  console.log("📋 All posts in database:");
  posts.forEach((post, idx) => {
    console.log(`  ${idx + 1}. ${post.heading} - Coords: (${post.Lat}, ${post.Lon})`);
  });

  // ✅ Redirect back to homepage to refresh map
  res.redirect("/");
});

const votedUsers = {}; // { postId: [ip1, ip2, ...] }
const reportedUsers = {}; // { postId: [ip1, ip2, ...] }

app.post("/upvote/:id", (req, res) => {
  const { id } = req.params;
  const ip = req.ip;

  const post = posts.find(p => p.id === id);
  if (!post) return res.status(404).json({ success: false });

  if (!votedUsers[id]) votedUsers[id] = [];

  if (votedUsers[id].includes(ip)) {
    return res.json({ success: false, message: "Already voted" });
  }

  post.upvotes++;
  votedUsers[id].push(ip);

  console.log(`🔺 Upvote for post: ${post.heading}, new count: ${post.upvotes}`);

  res.json({ success: true, upvotes: post.upvotes });
});

// Report post endpoint
app.post("/report/:id", (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const ip = req.ip;

  const post = posts.find(p => p.id === id);
  if (!post) return res.status(404).json({ success: false, message: "Post not found" });

  if (!reportedUsers[id]) reportedUsers[id] = [];

  if (reportedUsers[id].includes(ip)) {
    return res.json({ success: false, message: "Already reported" });
  }

  // Validate reason
  const validReasons = ['spam', 'inappropriate', 'false-info', 'duplicate'];
  if (!validReasons.includes(reason)) {
    return res.status(400).json({ success: false, message: "Invalid report reason" });
  }

  // Initialize reports count if not exists
  if (!post.reports) post.reports = 0;
  
  post.reports++;
  reportedUsers[id].push(ip);

  console.log(`🚩 Report for post: ${post.heading}, reason: ${reason}, new count: ${post.reports}`);

  res.json({ success: true, reports: post.reports, reason: reason });
});

// Update post status endpoint
app.post("/api/posts/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Validate status
  const validStatuses = ['pending', 'in-progress', 'resolved'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ 
      success: false, 
      message: "Invalid status. Must be 'pending', 'in-progress', or 'resolved'" 
    });
  }

  const post = posts.find(p => p.id === id);
  if (!post) {
    return res.status(404).json({ 
      success: false, 
      message: "Post not found" 
    });
  }

  const oldStatus = post.status;
  post.status = status;

  console.log(`🔄 Status updated for post "${post.heading}": ${oldStatus} → ${status}`);

  res.json({ 
    success: true, 
    message: `Status updated to ${status}`,
    oldStatus: oldStatus,
    newStatus: status
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).send('Something went wrong!');
});

app.listen(port, () => {
  console.log(`🚀 Server Works Fine and Listening to port : ${port}`);
  console.log(`📍 Homepage: http://localhost:${port}`);
  console.log(`📝 Report Issue: http://localhost:${port}/new`);
});

// Debug: Print posts every time they change
setInterval(() => {
  console.log(`📊 Current posts count: ${posts.length}`);
}, 60000); // Every minute

app.get("/profile",(req,res) =>{
  res.render("profile.ejs");
});
