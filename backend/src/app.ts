import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes";

const app = express();

app.set("trust proxy", 1);

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", routes);

export default app;
