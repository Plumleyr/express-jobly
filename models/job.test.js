"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

let testJob;

beforeAll(commonBeforeAll);
beforeEach(async () => {
  await commonBeforeEach();
  const res = await db.query(`
    INSERT INTO jobs(title, salary, equity, company_handle)
    VALUES ('j5', 500, 0.05, 'c3')
    RETURNING id, title, salary, equity, company_handle`);
  testJob = res.rows[0];
});
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function() {
  const newJob = {
    title: "tester",
    salary: 100000,
    equity: 0.1,
    companyHandle: "c2"
  };

  test("works", async function() {
    let job = await Job.create(newJob);
    expect(job).toEqual({
      id: expect.any(Number),
      title: "tester",
      salary: 100000,
      equity: "0.1",
      companyHandle: "c2"
    });

    const result = await db.query(`
      SELECT id, title, salary, equity, company_handle
      FROM jobs
      WHERE id = $1`,
      [job.id]);
    expect(result.rows[0]).toEqual({
      id: job.id,
      title: "tester",
      salary: 100000,
      equity: "0.1",
      company_handle: "c2"
    });
  });
});

describe("findAll", function() {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "j1",
        salary: 100,
        equity: "0",
        companyHandle: "c1",
      },
      {
        id: expect.any(Number),
        title: "j2",
        salary: 200,
        equity: "0.01",
        companyHandle: "c1",
      },
      {
        id: expect.any(Number),
        title: "j3",
        salary: 300,
        equity: "0",
        companyHandle: "c2",
      },
      {
        id: expect.any(Number),
        title: "j4",
        salary: 400,
        equity: "0.04",
        companyHandle: "c3",
      },
      {
        id: testJob.id,
        title: "j5",
        salary: 500,
        equity: "0.05",
        companyHandle: "c3"
      }
    ]);
  });

  test("works with title filter", async () => {
    let jobs = await Job.findAll({title: 'J5'});
    expect(jobs).toEqual([{
      id: testJob.id,
      title: "j5",
      salary: 500,
      equity: "0.05",
      companyHandle: "c3"
    }]);
  });

  test("fails if minSalary not a number", async () => {
    try{
      await Job.findAll({minSalary: "not a number"});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** get */

describe("get", function() {
  test("gets job by id", async function() {  
    const job = await Job.get(testJob.id);
    expect(job).toEqual({
      id: testJob.id,
      title: "j5",
      salary: 500,
      equity: "0.05",
      companyHandle: "c3"
    });
  });

  test("not found if no job", async function () {
    try {
      await Job.get(45958595);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

describe("patch", function() {
  const updateData = {
    title: "j6",
    salary: 600,
    equity: 0
  };

  test("works", async function() {
    let job = await Job.update(testJob.id, updateData);
    expect(job).toEqual({
      id: testJob.id,
      title: "j6",
      salary: 600,
      equity: "0",
      companyHandle: 'c3'
    });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle
        FROM jobs
        WHERE id = $1`,
      [testJob.id]);
    expect(result.rows).toEqual([{
      id: testJob.id,
      title: "j6",
      salary: 600,
      equity: "0",
      company_handle: 'c3',
    }]);
  });

  test("works: null fields", async function() {
    const updateDataSetNulls = {
      title: "j7",
      salary: null,
      equity: null,
    };

    let job = await Job.update(testJob.id, updateDataSetNulls);
    expect(job).toEqual({
      id: testJob.id,
      title: "j7",
      salary: null,
      equity: null,
      companyHandle: 'c3'
    });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle
        FROM jobs
        WHERE id = $1`,
      [testJob.id]);
    expect(result.rows).toEqual([{
      id: testJob.id,
      title: "j7",
      salary: null,
      equity: null,
      company_handle: 'c3',
    }]);
  });

  test("not found if no such job", async function () {
    try {
      await Job.update(45958595, updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Job.update(testJob.id, {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

describe("remove", function () {
  test("works", async function () {
    await Job.remove(testJob.id);
    const res = await db.query(
        `SELECT id FROM jobs WHERE id=$1`,
      [testJob.id]);
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such company", async function () {
    try {
      await Job.remove(45958595);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});