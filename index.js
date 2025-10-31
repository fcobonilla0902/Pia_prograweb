require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
const { APP_ID, APP_SECRET, BASE_URL, PORT } = process.env;

// 1) Ruta para iniciar login con Facebook
app.get("/auth/facebook", (req, res) => {
  const redirectUri = `${BASE_URL}/auth/facebook/callback`;
  const url = `https://www.facebook.com/v17.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=email,user_posts&response_type=code`;
  res.redirect(url);
});

// 2) Callback de Facebook: intercambio de code por access_token
app.get("/auth/facebook/callback", async (req, res) => {
  const code = req.query.code;
  const redirectUri = `${BASE_URL}/auth/facebook/callback`;

  try {
    const tokenRes = await axios.get(
      "https://graph.facebook.com/v17.0/oauth/access_token",
      {
        params: {
          client_id: APP_ID,
          client_secret: APP_SECRET,
          redirect_uri: redirectUri,
          code,
        },
      }
    );

    const accessToken = tokenRes.data.access_token;

    res.send(`
      <h3>Token obtenido correctamente ✅</h3>
      <p><b>Access Token:</b></p>
      <pre>${accessToken}</pre>
      <a href="/posts?token=${accessToken}">Ver mis publicaciones</a>
    `);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("Error al obtener el token");
  }
});

// 3) Ruta para leer publicaciones del usuario
app.get("/posts", async (req, res) => {
  const token = req.query.token;
  try {
    const postsRes = await axios.get(
      "https://graph.facebook.com/v17.0/me/feed",
      {
        params: {
          access_token: token,
          fields: "id,message,created_time,permalink_url",
        },
      }
    );

    const posts = postsRes.data.data;
    let html = "<h2>Mis publicaciones:</h2>";

    posts.forEach((p) => {
      html += `
        <div style="border:1px solid #ccc; margin:10px; padding:10px">
          <b>ID:</b> ${p.id}<br>
          <b>Fecha:</b> ${p.created_time}<br>
          <b>Mensaje:</b> ${p.message ?? "<i>Sin texto</i>"}<br>
          <a href="${p.permalink_url}" target="_blank">Ver en Facebook</a>
        </div>
      `;
    });

    res.send(html);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("Error al obtener publicaciones");
  }
});

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
