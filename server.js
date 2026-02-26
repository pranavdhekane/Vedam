require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();

// use env port or fallback
const PORT = process.env.PORT || 3000;

// view engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// static files
app.use(express.static(path.join(__dirname, "public")));

// routes
app.get("/", (req, res) => {
  res.render("login", {
    title: process.env.APP_NAME || "Home",
    name: "Pranav"
  });
});

// server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
}); 