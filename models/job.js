"use strict";

const db = require("../db");
const { NotFoundError, BadRequestError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related function for jobs. */

class Job{
  /** Create a job (from data), update db, return new job data
  * 
  * data should be { title, salary, equity, companyHandle }
  * 
  * returns { id, tilte, salary, equity, companyHandle }
  * 
  * Throws NotFoundErrorif company not in database.
  */

  static async create({ title, salary, equity, companyHandle }){
    const companyCheck = await db.query(
        `SELECT handle
         FROM companies
         WHERE handle = $1`,
      [companyHandle]);

    if(companyCheck.rows.length === 0)
      throw new NotFoundError(`No company with handle of: ${companyHandle}`)

    const result = await db.query(
      `INSERT INTO jobs
       (title, salary, equity, company_handle)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
      [title, salary, equity, companyHandle]
    );
    const job = result.rows[0];

    return job;
  }
/** Find all jobs
 *  
 * Returns [{ id, title, salary, equity, companyHandle }]
 * 
 * throws BadRequestError if salary not a number
 */
  static async findAll({title, minSalary, hasEquity} = {}){
    if(minSalary !== undefined && isNaN(minSalary)) throw new BadRequestError("salary must be a number")
    let query = `SELECT id, title, salary, equity, company_handle AS "companyHandle" FROM jobs`
    let whereClauses = [];
    let queryValues = [];

    if(title){
      queryValues.push(`%${title}%`);
      whereClauses.push(`title ILIKE $${queryValues.length}`)
    }

    if(minSalary){
      queryValues.push(minSalary);
      whereClauses.push(`salary >= $${queryValues.length}`)
    }

    if(hasEquity){
      queryValues.push(0);
      whereClauses.push(`equity > $${queryValues.length}`)
    }

    if (whereClauses.length > 0) {
      query += " WHERE " + whereClauses.join(" AND ");
    }

    query += " ORDER BY title";
  
    const jobsRes = await db.query(query, queryValues);
    return jobsRes.rows;
  }

  /** Given a job id, return data about the job
   * 
   * Returns { id, title, salary, equity, companyHandle }
   * 
   * throws NotFoundError if not found.
   */

  static async get(id){
    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
       FROM jobs
       WHERE id = $1`,
       [id]);

    const job = result.rows[0]

    if (!job) throw new NotFoundError(`No job with id of: ${id}`)

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: { title, salary, equity }
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(
      data,
      {
        companyHandle: "company_handle"
      });
    const idVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs
                      SET ${setCols}
                      WHERE id = ${idVarIdx}
                      RETURNING id,
                                title,
                                salary,
                                equity,
                                company_handle AS "companyHandle"`
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job with id of ${id}`)

    return job
  }

    /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

  static async remove(id) {
    const result = await db.query(
      `DELETE
       FROM jobs
       WHERE id = $1
       RETURNING id`,
     [id]);
    
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job with id of: ${id}`)
  }
}

module.exports = Job;