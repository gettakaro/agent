import { type Request, type Response, Router } from "express";
import { generateOpenAPIDocument } from "../openapi/registry.js";

const router = Router();

router.get("/openapi.json", (_req: Request, res: Response) => {
  res.json(generateOpenAPIDocument());
});

router.get("/api.html", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <script type="module" src="https://cdn.jsdelivr.net/npm/rapidoc@9.3.8"></script>
  </head>
  <body>
    <rapi-doc
      spec-url="/api/openapi.json"
      render-style="read"
      fill-request-fields-with-example="false"
      persist-auth="true"
      sort-tags="true"
      sort-endpoints-by="method"
      show-method-in-nav-bar="as-colored-block"
      show-header="false"
      allow-authentication="true"
      allow-server-selection="false"
      schema-style="table"
      schema-expand-level="1"
      default-schema-tab="schema"
      primary-color="#664de5"
      bg-color="#151515"
      text-color="#c2c2c2"
      header-color="#353535"
    />
  </body>
</html>`);
});

export const openAPIRoutes = router;
