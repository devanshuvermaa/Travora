let listingCounter = 0;
let listings = [];

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
  value && typeof value.equals === "function" ? value : createId(value || ++listingCounter);

const matchesId = (value, id) => value && value._id.toString() === id.toString();

const query = (value) => ({
  populate() {
    return this;
  },
  then(resolve, reject) {
    return Promise.resolve(value).then(resolve, reject);
  },
});

class Listing {
  constructor(data = {}) {
    Object.assign(this, data);
    this._id = asId(data._id);
    this.reviews = data.reviews || [];
  }

  async save() {
    const index = listings.findIndex((listing) => matchesId(listing, this._id));
    if (index === -1) listings.push(this);
    else listings[index] = this;
    return this;
  }
}

Listing.find = jest.fn(async () => listings);
Listing.findById = jest.fn((id) => query(listings.find((listing) => matchesId(listing, id))));
Listing.findByIdAndUpdate = jest.fn(async (id, updates) => {
  const listing = listings.find((item) => matchesId(item, id));
  if (!listing) return null;

  if (updates.$pull) {
    listing.reviews = listing.reviews.filter(
      (reviewId) =>
        (reviewId._id || reviewId).toString() !== updates.$pull.reviews.toString(),
    );
  } else {
    Object.assign(listing, updates);
  }
  return listing;
});
Listing.findByIdAndDelete = jest.fn(async (id) => {
  const index = listings.findIndex((listing) => matchesId(listing, id));
  if (index === -1) return null;
  return listings.splice(index, 1)[0];
});
Listing.__reset = () => {
  listingCounter = 0;
  listings = [];
};
Listing.__all = () => listings;
Listing.__createId = createId;

module.exports = Listing;
