const { BadRequestError } = require("../expressError");

/** Takes a data obj and an obj of data key names that are not 
 * the same as the SQL row names take the keys of the data obj 
 * (if there are no keys throw err) maps the keys to a var for each
 * key that is not within the jsToSql obj just returns that key name else
 * changes the key name to the SQL row name match the val of the key of jsToSql
 *  and gives each key an idx. func returns each key in a string with commas 
 * to match SQL syntax and the values of the data obj.
*/

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate }