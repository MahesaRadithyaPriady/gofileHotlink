const express = require("express");
const { chromium } = require("playwright");

const app = express();
const PORT = 3000;

app.get("/fetch-gofile", async (req, res) => {
  const fileId = req.query.id; // Ambil ID file dari query, misalnya ?id=98Lx2i
  if (!fileId) return res.status(400).json({ error: "File ID diperlukan!" });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let parsedData = null;

  // Tangkap setiap console log yang dikirim ke halaman
  page.on("console", async (msg) => {
    try {
      const args = msg.args();
      for (const arg of args) {
        const val = await arg.jsonValue();
        // Jika objek log memiliki struktur data yang diharapkan, simpan ke parsedData
        if (
          val &&
          typeof val === "object" &&
          val.status === "ok" &&
          val.data &&
          val.metadata
        ) {
          parsedData = val;
        }
      }
    } catch (error) {
      console.error("Error capturing console message:", error);
    }
  });

  try {
    console.log(`🔍 Membuka halaman GoFile: https://gofile.io/d/${fileId}`);
    await page.goto(`https://gofile.io/d/${fileId}`, {
      waitUntil: "networkidle",
    });
    // Tunggu beberapa saat agar seluruh log muncul
    await page.waitForTimeout(5000);

    await browser.close();

    if (parsedData) {
      // Ambil direct link video dan thumbnail dari objek parsedData
      const children = parsedData.data.children;
      const fileKey = Object.keys(children)[0];
      const videoLink = children[fileKey].link;
      const thumbnailLink = children[fileKey].thumbnail;

      return res.json({
        status: "ok",
        videoLink,
        thumbnailLink,
        data: parsedData,
      });
    } else {
      return res
        .status(404)
        .json({ status: "error", message: "Data tidak ditemukan di console!" });
    }
  } catch (error) {
    await browser.close();
    return res.status(500).json({ status: "error", message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
