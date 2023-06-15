const express = require("express");
const app = express();
const PORT = 8080;
const cookieSession = require("cookie-session");
const bcrypt = require("bcryptjs");
const helpers = require("./helpers");

// Middleware
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

// Move users object declaration here
const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur",
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk",
  },
};

app.use(cookieSession({
  name: "session",
  keys: ["key1", "key2"]
}));

app.use((req, res, next) => {
  res.locals.user = users[req.session.user_id];
  next();
});

const urlDatabase = {
  "b2xVn2": { longURL: "http://www.lighthouselabs.ca", userID: "userRandomID" , visits: 0 },
  "9sm5xK": { longURL: "http://www.google.com", userID: "user2RandomID" , visits: 0}
};

function generateRandomString() {
  let randomString = "";
  const characters = "123abc";
  const length = 6;
  for (let i = 0; i < length; i++) {
    randomString += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return randomString;
}

function getUserById(userId) {
  return users[userId];
}

function getUserByEmail(email) {
  for (const userId in users) {
    if (users[userId].email === email) {
      return users[userId];
    }
  }
  return null;
}

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  const templateVars = { greeting: "Hello World!" };
  res.render("hello_world", templateVars);
});

app.get("/urls", (req, res) => {
  const userId = req.session.user_id;
  const user = getUserById(userId);

  if (!user) {
    const templateVars = { 
      error: "You need to be logged in to access this.", 
      user: null,
    };
    res.render("login", templateVars);
    return;
  }

  const userUrls = {};

  for (const urlId in urlDatabase) {
    if (urlDatabase[urlId].userID === userId) {
      userUrls[urlId] = {
        longURL: urlDatabase[urlId].longURL,
        visits: urlDatabase[urlId].visits || 0,
      };
    }
  }

  const templateVars = {
    urls: userUrls,
    user: user,
  };

  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  const userId = req.session.user_id;
  const user = getUserById(userId);

  if (!user) {
    const templateVars = {
      error: "You need to be logged in to create new URLs.",
      user: null,
    };
    res.render("login", templateVars);
    return;
  }

  const templateVars = {
    user: user
  };
  res.render("urls_new", templateVars);
});



app.get("/u/:id", (req, res) => {
  const shortURL = req.params.id;
  const longURL = urlDatabase[shortURL];

  if (longURL) {
    longURL.visits++;
    res.redirect(longURL.longURL);
  } else {
    res.status(404).send("URL not found");
  }
});

app.post("/urls", (req, res) => {
  const id = generateRandomString();
  const longURL = req.body.longURL;
  const userId = req.session.user_id;
  urlDatabase[id] = { 
    longURL: longURL, 
    userID: userId, 
    visits: 0, 
  };
  res.redirect(`/urls/${id}`);
});

app.get("/urls/:id", (req, res) => {
  const id = req.params.id;
  const url = urlDatabase[id];

  if (url) {
    const templateVars = {
      id: id,
      longURL: url.longURL,
      visits: url.visits || 0, // Assign visits as 0 if not defined
    };
    res.render("urls_show", templateVars);
  } else {
    res.status(404).send("URL not found");
  }
});

app.post("/urls/:id/delete", (req, res) => {
  const id = req.params.id;
  if (urlDatabase[id]) {
    delete urlDatabase[id];
    res.redirect("/urls");
  } else {
    res.status(404).send("URL not found");
  }
});

app.post("/urls/:id", (req, res) => {
  const id = req.params.id;
  const newLongURL = req.body.longURL;
  urlDatabase[id].longURL = newLongURL;
  res.redirect("/urls");
});

app.get("/register", (req, res) => {
  if (req.session.user_id) {
    res.redirect("/urls");
  } else {
    const templateVars = {
      user: null,
      error: null
    };
    res.render("register", templateVars);
  }
});

app.post("/register", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    const templateVars = {
      user: null,
      error: "Email and password fields cannot be empty."  
    };
    res.status(400).render("register", templateVars); 
    return;
  }

  const user = getUserByEmail(email, users);

  if (user) {
    const templateVars = {
      user: null,
      error: "Email already registered."  
    };
    res.status(400).render("register", templateVars); 
  }

  const id = generateRandomString();
  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = {
    id,
    email,
    password: hashedPassword,
  };
  users[id] = newUser;
  req.session.user_id = id;
  res.redirect("/urls");
});

app.get("/login", (req, res) => {
  if (req.session.user_id) {
    res.redirect("/urls");
  } else {
    const templateVars = {
      user: null,
      error: null
    };
    res.render("login", templateVars);
  }
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = getUserByEmail(email, users);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    const templateVars = {
      user: null,
      error: "Invalid credentials"  
    };
    res.status(403).render("login", templateVars); 
    return;
  }

  req.session.user_id = user.id;
  res.redirect("/urls");
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/login");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
