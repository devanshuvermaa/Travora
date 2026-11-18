const { z } = require("zod");
const ExpressError = require("./utils/ExpressError");

const requiredText = (field) =>
  z.string({ error: `${field} is required` }).trim().min(1, `${field} is required`);

const listingSchema = z.object({
  listing: z.object({
    title: requiredText("Title"),
    description: requiredText("Description"),
    location: requiredText("Location"),
    country: requiredText("Country"),
    price: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.coerce
        .number({ error: "Price must be a number" })
        .finite("Price must be a valid number")
        .min(0, "Price must be greater than or equal to 0"),
    ),
  }),
});

const reviewSchema = z.object({
  review: z.object({
    rating: z.coerce
      .number({ error: "Rating must be a number" })
      .int("Rating must be a whole number")
      .min(1, "Rating must be between 1 and 5")
      .max(5, "Rating must be between 1 and 5"),
    comment: requiredText("Comment"),
  }),
});

const signupSchema = z.object({
  username: requiredText("Username").min(3, "Username must be at least 3 characters"),
  email: requiredText("Email").email("Email must be valid"),
  password: requiredText("Password").min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  username: requiredText("Username"),
  password: requiredText("Password"),
});

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join(".") || "request"}: ${issue.message}`)
      .join(", ");
    return next(new ExpressError(400, message));
  }

  req.body = result.data;
  next();
};

module.exports = {
  listingSchema,
  reviewSchema,
  signupSchema,
  loginSchema,
  validate,
};
