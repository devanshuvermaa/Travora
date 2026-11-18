jest.mock("../models/listing");
jest.mock("../models/reviews");
jest.mock("../models/user");
jest.mock("../cloudConfig", () => ({
  storage: {
    _handleFile(req, file, callback) {
      file.stream.resume();
      callback(null, { path: "https://example.test/listing.jpg", filename: "listing.jpg" });
    },
    _removeFile(req, file, callback) {
      callback(null);
    },
  },
}));
jest.mock("../public/js/geocode", () => ({
  geocodeAddress: jest.fn(async () => ({ lat: 26.9124, lng: 75.7873 })),
}));

const request = require("supertest");
const app = require("../app");
const Listing = require("../models/listing");
const Review = require("../models/reviews");
const User = require("../models/user");

const validListing = {
  "listing[title]": "City Apartment",
  "listing[description]": "A comfortable stay in the city center.",
  "listing[location]": "Jaipur",
  "listing[country]": "India",
  "listing[price]": "1200",
};

const signup = (agent, username = "traveler") =>
  agent.post("/signup").type("form").send({
    username,
    email: `${username}@example.test`,
    password: "password1",
  });

const createListing = (agent, fields = validListing) =>
  agent
    .post("/listings")
    .field(fields)
    .attach("listing[image]", Buffer.from("mock image"), "listing.jpg");

beforeEach(() => {
  jest.clearAllMocks();
  Listing.__reset();
  Review.__reset();
  User.__reset();
});

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe("listing API flows", () => {
  test("retrieves listings", async () => {
    const listing = new Listing({
      title: "Test Villa",
      price: 3000,
      image: { url: "https://example.test/villa.jpg" },
    });
    await listing.save();

    const response = await request(app).get("/listings");

    expect(response).toHaveProperty("status", 200);
    expect(response.text).toContain("Test Villa");
  });

  test("redirects unauthenticated listing creation to login", async () => {
    const response = await createListing(request(app));

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/login");
    expect(Listing.__all()).toHaveLength(0);
  });

  test("creates a listing with an authenticated session and mocked upload", async () => {
    const agent = request.agent(app);
    await signup(agent);

    const response = await createListing(agent);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/listings");
    expect(Listing.__all()).toHaveLength(1);
    expect(Listing.__all()[0]).toMatchObject({
      title: "City Apartment",
      coordinates: [26.9124, 75.7873],
      image: { url: "https://example.test/listing.jpg", filename: "listing.jpg" },
    });
  });

  test("returns 400 and the error page for an invalid listing payload", async () => {
    const agent = request.agent(app);
    await signup(agent);

    const response = await agent
      .post("/listings")
      .field({ ...validListing, "listing[title]": "", "listing[price]": "-10" });

    expect(response.status).toBe(400);
    expect(response.text).toContain("listing.title");
    expect(Listing.__all()).toHaveLength(0);
  });

  test("updates and deletes an owned listing", async () => {
    const agent = request.agent(app);
    await signup(agent);
    await createListing(agent);
    const listing = Listing.__all()[0];

    const updateResponse = await agent
      .put(`/listings/${listing._id}?_method=PUT`)
      .type("form")
      .send({ ...validListing, "listing[title]": "Updated Apartment", "listing[price]": "1500" });

    expect(updateResponse.status).toBe(302);
    expect(updateResponse.headers.location).toBe(`/listings/${listing._id}`);
    expect(Listing.__all()[0]).toMatchObject({ title: "Updated Apartment", price: 1500 });

    const deleteResponse = await agent.delete(`/listings/${listing._id}?_method=DELETE`);

    expect(deleteResponse.status).toBe(302);
    expect(deleteResponse.headers.location).toBe("/listings");
    expect(Listing.__all()).toHaveLength(0);
  });

  test("rejects modification by a non-owner", async () => {
    const owner = new User({ username: "owner", email: "owner@example.test" });
    await User.register(owner, "password1");
    const listing = new Listing({
      title: "Owner Listing",
      description: "Only the owner can update this.",
      location: "Jaipur",
      country: "India",
      price: 1000,
      image: { url: "https://example.test/owner.jpg" },
      owner,
      coordinates: [26.9, 75.8],
    });
    await listing.save();
    const agent = request.agent(app);
    await signup(agent, "renter");

    const response = await agent
      .put(`/listings/${listing._id}?_method=PUT`)
      .type("form")
      .send(validListing);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(`/listings/${listing._id}`);
    expect(Listing.__all()[0].title).toBe("Owner Listing");
  });
});

describe("authentication and validation flows", () => {
  test("signs up a valid user and persists the session", async () => {
    const agent = request.agent(app);

    const signupResponse = await signup(agent);
    const protectedResponse = await agent.get("/listings/new");

    expect(signupResponse.status).toBe(302);
    expect(signupResponse.headers.location).toBe("/listings");
    expect(protectedResponse.status).toBe(200);
    expect(protectedResponse.text).toContain("Add New Listing");
  });

  test("returns 400 for an invalid signup Zod payload", async () => {
    const response = await request(app).post("/signup").type("form").send({
      username: "ab",
      email: "not-an-email",
      password: "short",
    });

    expect(response.status).toBe(400);
    expect(response.text).toContain("Username must be at least 3 characters");
    expect(User.__findByUsername("ab")).toBeUndefined();
  });

  test("logs in with valid credentials and rejects invalid credentials", async () => {
    const signupAgent = request.agent(app);
    await signup(signupAgent);
    await signupAgent.get("/logout");
    const loginAgent = request.agent(app);

    const failedLogin = await loginAgent.post("/login").type("form").send({
      username: "traveler",
      password: "wrong-password",
    });
    const successfulLogin = await loginAgent.post("/login").type("form").send({
      username: "traveler",
      password: "password1",
    });
    const protectedResponse = await loginAgent.get("/listings/new");

    expect(failedLogin.status).toBe(302);
    expect(failedLogin.headers.location).toBe("/login");
    expect(successfulLogin.status).toBe(302);
    expect(successfulLogin.headers.location).toBe("/listings");
    expect(protectedResponse.status).toBe(200);
  });
});

describe("review API flows", () => {
  test("creates and deletes a review for an authenticated author", async () => {
    const agent = request.agent(app);
    await signup(agent);
    await createListing(agent);
    const listing = Listing.__all()[0];

    const createResponse = await agent
      .post(`/listings/${listing._id}/reviews`)
      .type("form")
      .send({ "review[rating]": "5", "review[comment]": "Excellent stay" });

    expect(createResponse.status).toBe(302);
    expect(listing.reviews).toHaveLength(1);
    const review = listing.reviews[0];

    const deleteResponse = await agent.delete(
      `/listings/${listing._id}/reviews/${review._id}?_method=DELETE`,
    );

    expect(deleteResponse.status).toBe(302);
    expect(listing.reviews).toHaveLength(0);
    expect(Review.__all()).toHaveLength(0);
  });

  test("redirects unauthenticated review creation to login", async () => {
    const listing = new Listing({ _id: "listing-1", reviews: [] });
    await listing.save();

    const response = await request(app)
      .post(`/listings/${listing._id}/reviews`)
      .type("form")
      .send({ "review[rating]": "5", "review[comment]": "Excellent stay" });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/login");
  });

  test("returns 400 for an invalid review payload", async () => {
    const agent = request.agent(app);
    await signup(agent);
    await createListing(agent);
    const listing = Listing.__all()[0];

    const response = await agent
      .post(`/listings/${listing._id}/reviews`)
      .type("form")
      .send({ "review[rating]": "6", "review[comment]": "" });

    expect(response.status).toBe(400);
    expect(response.text).toContain("review.rating");
    expect(Review.__all()).toHaveLength(0);
  });
});

describe("centralized error responses", () => {
  test("serves interactive OpenAPI documentation", async () => {
    const response = await request(app).get("/api-docs/");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Swagger UI");
  });

  test("renders the existing error page with a 404 status", async () => {
    const response = await request(app).get("/missing-page");

    expect(response.status).toBe(404);
    expect(response.text).toContain("page not found");
  });

  test("returns a sanitized 500 response for an unexpected controller error", async () => {
    Listing.find.mockRejectedValueOnce(new Error("database password=secret"));

    const response = await request(app).get("/listings");

    expect(response.status).toBe(500);
    expect(response.text).toContain("Something went wrong");
    expect(response.text).not.toContain("password=secret");
  });
});
