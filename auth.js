const express = require("express");
const {
  employee,
  payment,
  Transaction,
  clientdata,
  quota
} = require("./dbase/modules");
let nodemailer = require("nodemailer");
let app = express.Router();

let http = require("http");
let APIKey = "f51c3293f9caacc25126cfc70764ccfd";
let sender = "8583";

const transporter = nodemailer.createTransport({
  host: "mail.tecstik.com",
  port: 465,
  auth: {
    user: "appSupport@tecstik.com",
    pass: "TecstikApps#123",
  },
});

function emailSnd(doc) {
  let mailOptions = {
    from: "appSupport@tecstik.com",
    to: doc.employeeEmail,
    subject: "Your account has been created successfully!",
    html: `<h1>Your ${doc.employeeName} account has been created on KollectIt as role ${doc.Role}</h1>`,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log("error=>", error);
    } else {
      console.log("Email sent: =>" + info.response);
    }
  });
}

function smsSnd(doc) {
  let receiver = doc.employeeEmail;
  let textmessage = `<h1>Your ${doc.employeeName} account has been created on KollectIt as role ${doc.Role}</h1>`;
  let options = {
    host: "api.veevotech.com",
    path:
      "/sendsms?hash=" +
      APIKey +
      "&receivenum=" +
      receiver +
      "&sendernum=" +
      encodeURIComponent(sender) +
      "&textmessage=" +
      encodeURIComponent(textmessage),
    method: "GET",
    setTimeout: 30000,
  };
  let req = http.request(options, (res) => {
    res.setEncoding("utf8");
    res.on("data", (chunk) => {
      console.log(chunk.toString());
    });
    console.log("STATUS: " + res.statusCode);
  });
  req.on("error", function (e) {
    console.log("problem with request: " + e.message);
  });
  console.log(options, "options");
  console.log(receiver, "receiver");
  req.end();
}
// change password

app.post("/ChangePassword", (req, res, next) => {
  console.log(req.body.employeePassword);
  if (!req.body.empolyeeObjectId) {
    res.send("empolyeeObjectId has been required");
  } else {
    employee.findById({ _id: req.body.empolyeeObjectId }, (err, doc) => {
      if (!err) {
        if (req.body.employeePassword === doc.employeePassword) {
          doc.update(
            { employeePassword: req.body.newPassword },
            {},
            function (err, data) {
              console.log("password updated");
              res.send("Password has been Change Successfull");
            }
          );
        } else {
          res.send("Please Correct the Password");
        }
      } else {
        res.send("Empolyee not found");
      }
    });
  }
});

// login

app.post("/login", (req, res, next) => {
  if (!req.body.email || !req.body.password) {
    res.status(403).send(
      `please send email and passwod in json body.
            e.g:
             {
            "email": "myMail@gmail.com",
            "password": "abc",
         }`
    );
    return;
  }
  employee.findOne({ employeeEmail: req.body.email }, function (err, doc) {
    console.log(doc);
    if (!err) {
      if (req.body.password === doc.employeePassword) {
        res.send(doc);
      }
    } else {
      res.status(403).send({
        message: "Empolyee not found",
      });
    }
  });
});

// Create Empolyee

app.post("/employe", (req, res, next) => {
  if (!req.body.email || !req.body.password) {
  } else {
    employee.findOne({ employeeEmail: req.body.email }, (err, doc) => {
      if (!err && !doc) {
        let employ = new employee({
          employeeName: req.body.name,
          employeeEmail: req.body.email,
          employeePassword: req.body.password,
          createdBy: req.body.createdBy,
          Role: req.body.Role,
        });
        employ.save((err, doc) => {
          if (!err) {
            if(doc.Role.toLowerCase()=="admin"){
            let newQuota= new quota({
              Limit:15,
              Utilized:0,
              BelongsTo:doc._id

            })
            newQuota.save((err, qta) => {
              console.log("Employee with quota",doc,qta);
              res.send({ message: "Employee created",data:{ doc,qta} });
            }
            )
          }
            res.send({ message: "Employee created", doc });
            // Send OTP with Email
            // req.body.employeeNumber ? emailSnd(doc) : emailSnd(doc);
            // emailSnd(doc);
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(req.body.email)
              ? emailSnd(doc)
              : smsSnd(doc);
          } else {
            res.status(500).send("Error in creating Employee, " + err);
          }
        });
      } else {
        res.status(409).send({
          // message: `Your ${doc.employeeName} account has been created on KollectIt as role ${doc.Role}`,
          message: "Employee  alredy exist",
        });
      }
    });
  }
});

// Super Admin
app.get("/employe", (req, res, next) => {
  employee.find({ Role: "Awaiting" }, (err, data) => {
    if (!err) {
      res.send(data);
    } else {
      res.status(500).send("error");
    }
  });
});

//Post Admin

app.post("/AdminEmploye", (req, res, next) => {
  employee.findById({ _id: req.body.id }, (err, data) => {
    if (data) {
      data.updateOne(
        { Role: req.body.Role, Role: "Admin" },
        (err, updatestatus) => {
          if (updatestatus) {
            res.send({ message: "Admin created Successfully!" });
          } else {
            res.send(err, "ERROR");
          }
        }
      );
    } else {
      res.status(409).send({
        message: "employee Not Find",
      });
    }
  });
});

// Get Admin

app.get("/AdminEmploye", (req, res, next) => {
  employee.find({ Role: "Admin" }, (err, data) => {
    if (!err) {
      res.send(data);
    } else {
      res.status(500).send("error");
    }
  });
});

// Post  Cashier
app.post("/CashierEmploye", (req, res, next) => {
  employee.findById({ _id: req.body.id }, (err, data) => {
    if (data) {
      data.updateOne(
        { Role: req.body.Role, Role: "Cashier" },
        (err, updatestatus) => {
          if (updatestatus) {
            res.send({ message: "Admin created Successfully!" });
          } else {
            res.send(err, "ERROR");
          }
        }
      );
    } else {
      res.status(409).send({
        message: "employee Not Find",
      });
    }
  });
});

// Get Cashier

app.get("/CashierEmploye", (req, res, next) => {
  employee.find({ Role: "Cashier" }, (err, data) => {
    if (!err) {
      res.send(data);
    } else {
      res.status(500).send("error");
    }
  });
});

// Post Rider

app.post("/RiderEmploye", (req, res, next) => {
  employee.findById({ _id: req.body.id }, (err, data) => {
    if (data) {
      data.updateOne(
        { Role: req.body.Role, Role: "Rider" },
        (err, updatestatus) => {
          if (updatestatus) {
            res.send({ message: "Admin created Successfully!" });
          } else {
            res.send(err, "ERROR");
          }
        }
      );
    } else {
      res.status(409).send({
        message: "employee Not Find",
      });
    }
  });
});

//  get Rider

app.get("/RiderEmploye", (req, res, next) => {
  employee.find({ Role: "Rider" }, (err, data) => {
    if (!err) {
      res.send(data);
    } else {
      res.status(500).send("error");
    }
  });
});
//- bulk transfer

app.post("/bulkTransfer", (req, res, next) => {
  console.log("In Bulk ransfer", req.body);

  let filters = req.body.filter;
  let transactiondata = req.body.transaction;

  payment.updateMany(
    { _id: { $in: filters } },
    { $set: { heldby: req.body.heldby } },
    { multi: true },
    function (err, records) {
      if (err) {
        res.status(409).send({
          message: "PaymenTrasfer Error",
          err,
        });
      } else {
        const newtransaction = new Transaction({
          Nature: transactiondata.nature,
          Instrument: transactiondata.Instrument,
          PaymentAmount: transactiondata.PaymentAmount,
          BelongsTo: transactiondata.BelongsTo,
          From: transactiondata.From,
          to: transactiondata.to,
        });
        newtransaction
          .save()
          .then((data) => {
            res.send(data);
          })
          .catch((err) => {
            res.status(500).send({
              message: "an error occured : " + err,
            });
          });
      }
    }
  );
});
//- single transfer
app.post("/paymentTransfer/:id", (req, res, next) => {
  // console.log(req.params.id, "dd");
  // console.log(req.body.id,"dddddddd");

  payment.findById(req.params.id, (err, data) => {
    if (!err) {
      data.updateOne(
        { heldby: req.body.heldby },

        (UpdateData, UpdateError) => {
          if (UpdateData) {
            res.send({
              message: "Payment Trasfare has been successfully!",
              data,
              UpdateData,
              status: 200,
            });
          } else {
            res.send(UpdateError);
          }
        }
      );
    } else {
      res.status(409).send({
        message: "PaymenTrasfer Error",
        err,
      });
    }
  });
});

app.post("/transaction", (req, res, next) => {
  if (!req.body.nature) {
    res.status(409).send(`
        Please send nature in json body
        e.g:
        "nature":"Recive && Transfer",
    `);
  } else {
    const newtransaction = new Transaction({
      Nature: req.body.nature,
      Instrument: req.body.Instrument,
      PaymentAmount: req.body.PaymentAmount,
      BelongsTo: req.body.BelongsTo,
      From: req.body.From,
      to: req.body.to,
    });
    newtransaction
      .save()
      .then((data) => {
        res.send(data);
      })
      .catch((err) => {
        res.status(500).send({
          message: "an error occured : " + err,
        });
      });
  }
});

app.get("/transaction", (req, res, next) => {
  Transaction.find({}, (err, data) => {
    if (!err) {
      res.send(data);
    } else {
      res.status(500).send("error");
    }
  });
});

app.post("/ShowRiderData", (req, res, next) => {
  if (!req.body.ClientRiderObjectId) {
    res.status(409).send(`
    Please send ClientRiderObjectId in json body
    e.g:
    "ClientRiderObjectId":"ClientRiderObjectId",
`);
  } else {
    clientdata.find(
      { ClientRiderObjectId: req.body.ClientRiderObjectId },
      (err, data) => {
        if (!err) {
          res.send(data);
        } else {
          res.status(500).send("error");
        }
      }
    );
  }
});

app.post("/craetedby", (req, res, next) => {
  if (!req.body.createdBy) {
    res.send("error");
  } else {
    employee.find(
      { createdBy: req.body.createdBy, Role: req.body.Role },
      (err, data) => {
        if (!err) {
          res.send(data);
        } else {
          res.send(err);
        }
      }
    );
  }
});

app.post("/BelongsTo", (req, res, next) => {
  if (!req.body.createdBy) {
    res.status(409).send(`
        Please send createdBy in json body
        e.g:
        "createdBy":"createdBy",
    `);
  } else {
    clientdata.find({ BelongsTo: req.body.createdBy }, (err, doc) => {
      if (!err) {
        res.send(doc);
      } else {
        res.send(err);
      }
    });
  }
});

app.post("/TransactionBelongsTo", (req, res, next) => {
  if (!req.body.BelongsTo) {
    res.status(409).send(`
        Please send BelongsTo in json body
        e.g:
        "BelongsTo":"BelongsTo",
    `);
  } else {
    Transaction.find({ BelongsTo: req.body.BelongsTo }, (err, doc) => {
      if (!err) {
        res.send(doc);
      } else {
        res.send(err);
      }
    });
  }
});

app.post("/empolyeeClientData", (req, res, next) => {
  if (!req.body.EmployeeObjectId) {
    res.status(409).send(`
        Please send EmployeeObjectId in json body
        e.g:
        "EmployeeObjectId":"EmployeeObjectId",
        "ClientObjectId":"ClientObjectId"
    `);
  } else {
    employee.find({ _id: req.body.EmployeeObjectId }, (err, doc) => {
      if (!err) {
        clientdata.find({ _id: req.body.ClientObjectId }, (err, data) => {
          if (!err) {
            res.send({
              Employee: doc,
              Client: data,
            });
          } else {
            res.send(err);
          }
        });
      } else {
        res.send(err);
      }
    });
  }
});

//
// =======================export
module.exports = app;
