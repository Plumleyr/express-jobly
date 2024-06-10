const { BadRequestError } = require("../expressError");
const { sqlForPartialUpdate } = require("./sql")

let data = {
    firstName: "pizza",
    isAdmin: false,
    email: "chicken@123.com"
}

let jsToSql = {
    firstName: "first_name",
    lastName: "last_name",
    isAdmin: "is_admin",
  }

describe("sqlForPartialUpdate", function() {
    test("works with data", () => {
        const {setCols, values } = sqlForPartialUpdate(data, jsToSql);
        expect(setCols).toEqual(`"first_name"=$1, "is_admin"=$2, "email"=$3`);
        expect(values).toEqual(["pizza", false, "chicken@123.com"]);
    });

    test("if no data throws error", () => {
        expect(() => {
            sqlForPartialUpdate({}, jsToSql);
        }).toThrow(BadRequestError);
    });
});
