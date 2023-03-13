const express = require('express');
const app = express();

const path = require('path');
const bodyParser = require('body-parser');
const passport = require('passport');

const data = require('all.db');
const db = new data();

const md5 = require('md5');

app.use(bodyParser.urlencoded({ parameterLimit: 100000, limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb', type: 'application/json' }));

app.use(require("express-session")({
    secret: "asdfgjas0dasd",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/public', express.static(path.join(__dirname, 'public')));
app.set("view engine", "ejs");


function adminReq(req, res, next) {
    if (req.session.isAdmin) {
        return next();
    }
    res.redirect("/login");

}

app.get('/', (req, res) => {
    res.send({ status: 200 });
});

app.get('/api/user/login', (req, res) => {
    res.send({ status: 200 })
});

function getAllUser() {
    var obj = db.get("user");
    var result = Object.keys(obj).map((key) => obj[key]);
    return result;
}

function getAllLicances() {
    var obj = db.get("licances");
    var result = Object.keys(obj).map((key) => key);
    return result;
}

app.get('/admin', adminReq, (req, res) => {
    render(req, res, 'admin.ejs', { admin: req.session.isAdmin, users: getAllUser(), licances: getAllLicances() });
});
const adminRank = ["Developer", "Access"];

app.post('/api/licances/create', adminReq, (req, res) => {
    if (req.session.isAdmin == true) {
        let data = db.get(`licances.${req.body.createlicance}`);
        if (data) return res.send({ message: "Licance Found" });
        db.set(`licances.${req.body.createlicance}`, true);
        res.redirect("/admin");
    }
});
app.post('/api/licances/remove', adminReq, (req, res) => {
    if (req.session.isAdmin == true) {
        let data = db.get(`licances.${req.body.removelicance}`);
        if (!data) return res.send({ message: "Licance Not Found" });
        db.delete(`licances.${req.body.removelicance}`);
        res.redirect("/admin");
    }
});

app.post('/api/user/addtime', adminReq, (req, res) => {
    if (req.session.isAdmin == true) {
        let data = db.get(`user.${req.body.newdayusername}`);
        if (!data) return res.send({ message: "User Not Found" });
        if (adminRank.includes(data.rank) && req.session.user.rank != "Developer") return res.send({ message: "You Can't Change Time of This User" });
        db.set(`user.${req.body.newdayusername}.expires`, Date.now() + (parseInt(req.body.newday) * 86400000));
        res.redirect("/admin");
    }
});

app.post('/api/user/password', adminReq, (req, res) => {
    if (req.session.isAdmin == true) {
        let data = db.get(`user.${req.body.passusername}`);
        if (!data) return res.send({ message: "User Not Found" });
        if (adminRank.includes(data.rank) && req.session.user.rank != "Developer") return res.send({ message: "You Can't Change Password of This User" });
        db.set(`user.${req.body.passusername}.password`, md5(req.body.passpassword));

        res.redirect("/admin");
    }
});

app.post('/api/user/remove', adminReq, (req, res) => {
    if (req.session.isAdmin == true) {
        let data = db.get(`user.${req.body.removeusername}`);
        if (!data) return res.send({ message: "User Not Found" });
        if (adminRank.includes(data.rank) && req.session.user.rank != "Developer") return res.send({ message: "You Can't Remove of This User" });
        db.remove(`user.${req.body.removeusername}`);
        res.redirect("/admin");
    }
});

app.post('/api/user/create', adminReq, (req, res) => {
    if (req.session.isAdmin == true) {
        let data = db.get(`user.${req.body.uusername}`);
        if (data) return res.send({ message: "Username Already Exists" });
        let user = {
            username: req.body.uusername,
            password: md5(req.body.upassword),
            rank: "User",
            expires: Date.now() + (parseInt(req.body.uday) * 86400000)
        }
		
        db.set(`user.${user.username}`, user);
        res.redirect("/admin");
    }
});

function formatDate(date, format) {
	const map = {
		mm: date.getMonth() + 1,
		dd: date.getDate(),
		yyyy: date.getFullYear()
	}

	return `${map.dd}\.${map.mm}\.${map.yyyy}`;
}
app.post("/gt/login", (req, res) => {
    let data = db.get(`user.${req.body.username}`);
    if (!data) return res.send("response|Failed\nmessage|Username or Password is Wrong" );
    if (data.password != md5(req.body.password)) return res.send("response|Failed\nmessage|Username or Password is Wrong" );
    if (data.expires != false) {
        if (Date.now() > data.expires) return res.send("response|Failed\nmessage|Your Account is Expired");
    }
    if (!req.body.mac) return res.send("response|Failed\nmessage|Something Went Wrong");
    if (data.mac) {
        if (md5(req.body.mac) != data.mac) return res.send("response|Failed\nmessage|Account Registered to Another Device");
    } else {
        db.set(`user.${req.body.username}.mac`,  md5(req.body.mac));
    }

    res.send(`response|Success\nmessage|Login Success\nexpires|${formatDate(new Date(data.expires))}`);
});

app.post("/gt/register", (req, res) => {
    let data = db.get(`user.${req.body.username}`);
    if (data) return res.send("response|Failed\nmessage|Username Already Used!");
	if (!req.body.password) return res.send("response|Failed\nmessage|Password Cannot Be Empty");
    if (!req.body.mac) return res.send("response|Failed\nmessage|Something Went Wrong");
	let licance = db.get(`licances.${req.body.licance}`) || false;
	if(!licance)  return res.send("response|Failed\nmessage|Licance Worng");
	let user = {
		username: req.body.username,
		password: md5(req.body.password),
		mac: md5(req.body.mac),
		licance: req.body.licance,
		rank: "User",
		expires: Date.now()+2592000000,
	}
	db.delete(`licances.${req.body.licance}`);
    db.set(`user.${req.body.username}`,  user);
    

    res.send("response|Success\nmessage|Register Success, Click Login");
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login");
});


app.get("/login", (req, res) => {
    render(req, res, 'login.ejs');
});

app.post('/login', (req, res) => {
    let data = db.get(`user.${req.body.username}`);
    if (!data) return res.send({ message: "Username or Password is Wrong" });
    if (data.password != md5(req.body.password)) return res.send({ message: "Username or Password is Wrong" });
    if (data.expires != false) {
        if (Date.now() > data.expires) return res.send({ message: "Your Account is Expired" });
    }
    if (adminRank.includes(data.rank)) req.session.isAdmin = true;
    req.session.user = { username: data.username, rank: data.rank, experies: data.expires };
    res.redirect("/admin");
});


const dataDir = path.resolve(`${process.cwd()}${path.sep}views`);
const templateDir = path.resolve(`${dataDir}${path.sep}${path.sep}`);
const render = async (req, res, template, data = {}) => {
    const baseData = {
        user: req.session.user || null,
    };
    res.render(path.resolve(`${templateDir}${path.sep}${template}`), Object.assign(baseData, data));
};

app.listen(80, () => {
    console.log(`Example app listening on port 80!`)
});