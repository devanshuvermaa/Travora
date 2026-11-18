let reviewCounter = 0;
let reviews = [];

const createId = (value) => {
  const id = {
    equals(other) {
      return this.toString() === other.toString();
    },
    toString() {
      return String(value);
    },
  };
  id._id = id;
  return id;
};

const asId = (value) =>
  value && typeof value.equals === "function" ? value : createId(value || ++reviewCounter);

const matchesId = (value, id) => value && value._id.toString() === id.toString();

class Review {
  constructor(data = {}) {
    Object.assign(this, data);
    this._id = asId(data._id);
  }

  async save() {
    const index = reviews.findIndex((review) => matchesId(review, this._id));
    if (index === -1) reviews.push(this);
    else reviews[index] = this;
    return this;
  }
}

Review.findById = jest.fn(async (id) => reviews.find((review) => matchesId(review, id)));
Review.findByIdAndDelete = jest.fn(async (id) => {
  const index = reviews.findIndex((review) => matchesId(review, id));
  if (index === -1) return null;
  return reviews.splice(index, 1)[0];
});
Review.__reset = () => {
  reviewCounter = 0;
  reviews = [];
};
Review.__all = () => reviews;

module.exports = Review;
