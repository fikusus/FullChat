const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.send("Server is up and running");
});

router.get("/client", (req, res) => {
  res.sendFile(`${__dirname}/public/client/index.html`)
});

router.get("/statistic", (req, res) => {
  res.sendFile(`${__dirname}/public/stat/index.html`)
});

router.get("/scripts/:id", (req, res) => {
  // eslint-disable-next-line no-undef
  const filePath = `${__dirname}/public/${req.params.id}`;

  res.download(filePath);
});

module.exports = router;
