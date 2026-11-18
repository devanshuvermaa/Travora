let userCounter = 0;
let users = [];

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

class User {
  constructor(data = {}) {
    Object.assign(this, data);
    this._id = data._id || createId(`user-${++userCounter}`);
  }
}

User.register = jest.fn(async (user, password) => {
  if (users.some((existingUser) => existingUser.username === user.username)) {
    throw new Error("A user with the given username is already registered");
  }
  user.password = password;
  users.push(user);
  return user;
});
User.authenticate = jest.fn(() => (username, password, done) => {
  const user = users.find(
    (existingUser) => existingUser.username === username && existingUser.password === password,
  );
  return user ? done(null, user) : done(null, false, { message: "Incorrect username or password." });
});
User.serializeUser = jest.fn(() => (user, done) => done(null, user._id.toString()));
User.deserializeUser = jest.fn(() => (id, done) => {
  const user = users.find((existingUser) => existingUser._id.toString() === id.toString());
  done(null, user || false);
});
User.__reset = () => {
  userCounter = 0;
  users = [];
};
User.__findByUsername = (username) => users.find((user) => user.username === username);

module.exports = User;
