import { Router, type IRouter } from "express";
import { privacyPolicyHtml } from "../pages/privacy-policy";

const router: IRouter = Router();

router.get("/privacy", (_req, res) => {
  res
    .status(200)
    .set("Cache-Control", "public, max-age=300")
    .type("html")
    .send(privacyPolicyHtml);
});

export default router;