const openapiSpecification = {
  openapi: "3.0.3",
  info: {
    title: "Travora Web Application",
    version: "1.0.0",
    description:
      "Travora is a server-rendered property rental application. Its routes render EJS pages and form submissions redirect with flash messages; they are not JSON API endpoints. Authentication uses Passport local sessions stored in an HTTP-only `connect.sid` cookie, not JWTs.",
  },
  tags: [
    { name: "Listings", description: "Server-rendered property listing pages and form actions." },
    { name: "Authentication", description: "Passport local signup, login, and logout flows." },
    { name: "Reviews", description: "Authenticated review form actions." },
  ],
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "connect.sid",
        description:
          "Passport session cookie issued after successful signup or login. Browsers send it automatically; Swagger UI cannot create an HTTP-only cookie manually.",
      },
    },
    parameters: {
      listingId: {
        name: "id",
        in: "path",
        required: true,
        description: "MongoDB listing identifier.",
        schema: { type: "string" },
      },
      reviewId: {
        name: "reviewId",
        in: "path",
        required: true,
        description: "MongoDB review identifier.",
        schema: { type: "string" },
      },
    },
    schemas: {
      ListingForm: {
        type: "object",
        required: [
          "listing[title]",
          "listing[description]",
          "listing[location]",
          "listing[country]",
          "listing[price]",
        ],
        properties: {
          "listing[title]": {
            type: "string",
            minLength: 1,
            description: "Required, trimmed property title.",
          },
          "listing[description]": {
            type: "string",
            minLength: 1,
            description: "Required, trimmed property description.",
          },
          "listing[location]": {
            type: "string",
            minLength: 1,
            description: "Required, trimmed location passed to geocoding.",
          },
          "listing[country]": {
            type: "string",
            minLength: 1,
            description: "Required, trimmed country.",
          },
          "listing[price]": {
            oneOf: [{ type: "number", minimum: 0 }, { type: "string", pattern: "^\\d+(?:\\.\\d+)?$" }],
            description:
              "Required price greater than or equal to 0. HTML forms submit it as text; Zod coerces valid numeric values.",
          },
        },
      },
      ListingCreateForm: {
        allOf: [
          { $ref: "#/components/schemas/ListingForm" },
          {
            type: "object",
            required: ["listing[image]"],
            properties: {
              "listing[image]": {
                type: "string",
                format: "binary",
                description:
                  "Required image upload. Cloudinary storage is configured for JPG, JPEG, and PNG files.",
              },
            },
          },
        ],
      },
      ListingUpdateForm: {
        allOf: [
          { $ref: "#/components/schemas/ListingForm" },
          {
            type: "object",
            properties: {
              "listing[image]": {
                type: "string",
                format: "binary",
                description:
                  "Optional replacement image. Cloudinary storage is configured for JPG, JPEG, and PNG files.",
              },
            },
          },
        ],
      },
      SignupForm: {
        type: "object",
        required: ["username", "email", "password"],
        properties: {
          username: { type: "string", minLength: 3, description: "Required, trimmed username." },
          email: { type: "string", format: "email", description: "Required, valid email address." },
          password: {
            type: "string",
            format: "password",
            minLength: 8,
            description: "Required password with at least 8 characters. Do not share real credentials.",
          },
        },
      },
      LoginForm: {
        type: "object",
        required: ["username", "password"],
        properties: {
          username: { type: "string", minLength: 1, description: "Required, trimmed username." },
          password: {
            type: "string",
            format: "password",
            minLength: 1,
            description: "Required, trimmed password. Do not share real credentials.",
          },
        },
      },
      ReviewForm: {
        type: "object",
        required: ["review[rating]", "review[comment]"],
        properties: {
          "review[rating]": {
            oneOf: [{ type: "integer", minimum: 1, maximum: 5 }, { type: "string", pattern: "^[1-5]$" }],
            description: "Required whole-number rating from 1 through 5; form values are coerced by Zod.",
          },
          "review[comment]": {
            type: "string",
            minLength: 1,
            description: "Required, trimmed review comment.",
          },
        },
      },
      ErrorPage: {
        type: "string",
        description: "HTML error page rendered by the centralized error handler.",
      },
    },
    responses: {
      ValidationError: {
        description: "Invalid Zod-validated form payload; an HTML error page is rendered.",
        content: { "text/html": { schema: { $ref: "#/components/schemas/ErrorPage" } } },
      },
      ServerError: {
        description: "Unexpected error; an HTML error page with a generic message is rendered.",
        content: { "text/html": { schema: { $ref: "#/components/schemas/ErrorPage" } } },
      },
    },
  },
  paths: {
    "/listings": {
      get: {
        tags: ["Listings"],
        summary: "Render all listings",
        responses: {
          200: { description: "HTML listing index page.", content: { "text/html": {} } },
          500: { $ref: "#/components/responses/ServerError" },
        },
      },
      post: {
        tags: ["Listings"],
        summary: "Create a listing",
        description:
          "Requires a Passport session and accepts a multipart HTML form. On success, redirects to `/listings` with a flash message.",
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: { "multipart/form-data": { schema: { $ref: "#/components/schemas/ListingCreateForm" } } },
        },
        responses: {
          302: {
            description:
              "Listing created and redirects to `/listings`, or an unauthenticated request redirects to `/login`.",
            headers: { Location: { schema: { type: "string" } } },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          500: { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/listings/{id}": {
      get: {
        tags: ["Listings"],
        summary: "Render one listing",
        parameters: [{ $ref: "#/components/parameters/listingId" }],
        responses: {
          200: { description: "HTML listing detail page.", content: { "text/html": {} } },
          302: { description: "Listing was not found; redirects to `/listings` with a flash message." },
          500: { $ref: "#/components/responses/ServerError" },
        },
      },
      put: {
        tags: ["Listings"],
        summary: "Update an owned listing",
        description:
          "Requires a Passport session and listing ownership. Browser forms use `?_method=PUT`; this operation documents the resulting PUT request.",
        security: [{ sessionCookie: [] }],
        parameters: [{ $ref: "#/components/parameters/listingId" }],
        requestBody: {
          required: true,
          content: { "multipart/form-data": { schema: { $ref: "#/components/schemas/ListingUpdateForm" } } },
        },
        responses: {
          302: {
            description:
              "Listing updated and redirects to its detail page, or an unauthenticated/unauthorized request redirects with a flash message.",
          },
          400: { $ref: "#/components/responses/ValidationError" },
          500: { $ref: "#/components/responses/ServerError" },
        },
      },
      delete: {
        tags: ["Listings"],
        summary: "Delete an owned listing",
        description:
          "Requires a Passport session and listing ownership. Browser forms use `?_method=DELETE`; this operation documents the resulting DELETE request.",
        security: [{ sessionCookie: [] }],
        parameters: [{ $ref: "#/components/parameters/listingId" }],
        responses: {
          302: {
            description:
              "Listing deleted and redirects to `/listings`, or an unauthenticated/unauthorized request redirects with a flash message.",
          },
          500: { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/signup": {
      get: {
        tags: ["Authentication"],
        summary: "Render the signup form",
        responses: { 200: { description: "HTML signup page.", content: { "text/html": {} } } },
      },
      post: {
        tags: ["Authentication"],
        summary: "Register and log in a user",
        description: "Creates a local Passport account and establishes a session on success.",
        requestBody: {
          required: true,
          content: { "application/x-www-form-urlencoded": { schema: { $ref: "#/components/schemas/SignupForm" } } },
        },
        responses: {
          302: { description: "Signup result; successful signup redirects to `/listings`, otherwise to `/signup`." },
          400: { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/login": {
      get: {
        tags: ["Authentication"],
        summary: "Render the login form",
        responses: { 200: { description: "HTML login page.", content: { "text/html": {} } } },
      },
      post: {
        tags: ["Authentication"],
        summary: "Log in with Passport local authentication",
        description: "Uses username and password form fields. A successful login establishes a session and redirects to the requested URL or `/listings`.",
        requestBody: {
          required: true,
          content: { "application/x-www-form-urlencoded": { schema: { $ref: "#/components/schemas/LoginForm" } } },
        },
        responses: {
          302: { description: "Login result; successful login redirects to the saved URL or `/listings`, failed login redirects to `/login`." },
          400: { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/logout": {
      get: {
        tags: ["Authentication"],
        summary: "Log out the current user",
        security: [{ sessionCookie: [] }],
        responses: { 302: { description: "Session logout completed; redirects to `/listings`." } },
      },
    },
    "/listings/{id}/reviews": {
      post: {
        tags: ["Reviews"],
        summary: "Create a review",
        description: "Requires a Passport session. On success, redirects to the listing detail page.",
        security: [{ sessionCookie: [] }],
        parameters: [{ $ref: "#/components/parameters/listingId" }],
        requestBody: {
          required: true,
          content: { "application/x-www-form-urlencoded": { schema: { $ref: "#/components/schemas/ReviewForm" } } },
        },
        responses: {
          302: {
            description:
              "Review created and redirects to the listing detail page, or an unauthenticated request redirects to `/login`.",
          },
          400: { $ref: "#/components/responses/ValidationError" },
          500: { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/listings/{id}/reviews/{reviewId}": {
      delete: {
        tags: ["Reviews"],
        summary: "Delete an authored review",
        description:
          "Requires a Passport session and review authorship. Browser forms use `?_method=DELETE`; this operation documents the resulting DELETE request.",
        security: [{ sessionCookie: [] }],
        parameters: [
          { $ref: "#/components/parameters/listingId" },
          { $ref: "#/components/parameters/reviewId" },
        ],
        responses: {
          302: {
            description:
              "Review deleted and redirects to the listing detail page, or an unauthenticated/unauthorized request redirects with a flash message.",
          },
          500: { $ref: "#/components/responses/ServerError" },
        },
      },
    },
  },
};

module.exports = openapiSpecification;
