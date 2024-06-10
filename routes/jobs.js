"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");

const express = require("express");
const { ensureLoggedIn, ensureIsAdmin } = require("../middleware/auth");
const { BadRequestError } = require("../expressError");
const Job = require("../models/job");
const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");

const router = express.Router();

/** Post / { job } => { job }
 * 
 * job should be { title, salary, equity, companyHandle }
 * 
 * Returns { id, title, salary, equity, companyHandle }
 * 
 * Authorization required: admin
 */

router.post('/', ensureLoggedIn, ensureIsAdmin, async (req, res, next) => {
  try{
    const validator = jsonschema.validate(req.body, jobNewSchema);
    if(!validator.valid){
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const job = await Job.create(req.body);
    return res.status(201).json({ job });
  } catch (e) {
    return next(e);
  }
});

/** Get / =>
 *    {jobs: [{ id, title, salary, equity, companyHandle }]}
 * 
 *  * * Can filter on provided search filters:
 * - title (will find case-insensitive, partial matches)
 * - minSalary
 * - hasEquity (if true will find jobs with equity greater than 0,
 *              else will return all jobs matching all or none of the
 *              other filters.)
 * 
 * Authorization required: none
 */

router.get("/", async (req, res, next) => {
  try {
    const filters = {};
    const { title, minSalary, hasEquity } = req.query;
    
    if(title) filters.title = title;

    if(minSalary !== undefined){
      const salary = Number(minSalary);
      if(isNaN(salary)) throw new BadRequestError("minSalary must be a number");
      filters.minSalary = salary;
    }

    if(hasEquity) filters.hasEquity = hasEquity;

    const jobs = await Job.findAll(filters);
    return res.json({ jobs });
  } catch (err) {
    return next(err);
  }
});

/** GET /[id] => { job }
 * 
 * job is { id, title, salary, equity, companyHandle }
 * 
 * Authorization required: none
 */

router.get('/:id', async (req, res, next) => {
  try{
    const job = await Job.get(req.params.id);
    return res.json({ job })
  } catch (e) {
    return next(e);
  }
});

/** PATCH /[id]  { fld1, fld2, ... } { job } 
 * 
 * Patches job data.
 * 
 * fields can be: { title, salary, equity }
 * 
 * Returns { id, title, salary, equity, companyHandle }
 * 
 * Authorization required: admin
*/

router.patch('/:id', ensureLoggedIn, ensureIsAdmin, async (req, res, next) => {
  try{
    const validator = jsonschema.validate(req.body, jobUpdateSchema);
    if(!validator.valid){
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const job = await Job.update(req.params.id, req.body);
    return res.json({ job });
  } catch (e) {
    return next(e);
  }
});

/** DELETE /[id] => { deleted: `Job with id of [id]` }
 * 
 * Authorization: admin
 */

router.delete('/:id', ensureLoggedIn, ensureIsAdmin, async (req, res, next) => {
  try{
    await Job.remove(req.params.id);
    return res.json({ deleted: `Job with id of ${req.params.id}`});
  } catch (e) {
    return next(e);
  }
});

module.exports = router;