"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u2Token,
} = require("./_testCommon");

let testJob;

beforeAll(commonBeforeAll);
beforeEach(async () => {
  await commonBeforeEach();
  const res = await db.query(`
    INSERT INTO jobs(title, salary, equity, company_handle)
    VALUES ('j5', 500, 0.05, 'c3')
    RETURNING id, title, salary, equity, company_handle AS companyHandle`);
  testJob = res.rows[0];
});
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", () => {
  const newJob = {
      title: "j6",
      salary: 600,
      equity: 0,
      companyHandle: "c2"
  };

  test("ok for admins", async () => {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toBe(201);
    expect(resp.body).toEqual({job: {
      id: expect.any(Number),
      title: "j6",
      salary: 600,
      equity: "0",
      companyHandle: "c2"
    }});
  });

  test("unauth for users", async () => {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body.error.message).toEqual("Unauthorized");
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          title: "new",
          salary: 10,
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          ...newJob,
          salary: "not-a-num",
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /jobs */

describe("GET /jobs", () => {
  test("ok for anon", async () => {
    const resp = await request(app).get("/jobs");
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      jobs:
        [
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
            equity: "0.02",
            companyHandle: "c1",
          },
          {
            id: expect.any(Number),
            title: "j3",
            salary: 300,
            equity: "0",
            companyHandle: "c3",
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
        ]
    });
  });

  test("fails: test next() handler", async function () {
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app)
        .get("/jobs")
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", () => {
  test("works for anon", async () => {
    const resp = await request(app).get(`/jobs/${testJob.id}`);
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({job:{
      id: testJob.id,
      title: "j5",
      salary: 500,
      equity: "0.05",
      companyHandle: "c3"
    }});
  });

  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/4940495`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", () => {
  test("works for admins", async () => {
    const resp = await request(app)
      .patch(`/jobs/${testJob.id}`)
      .send({
        title: "updated job"
      })
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.body).toEqual({
      job: {
        id: testJob.id,
        title: "updated job",
        salary: 500,
        equity: "0.05",
        companyHandle: "c3"
      },
    });
  });

  test("unauth for users", async () => {
    const resp = await request(app)
      .patch(`/jobs/${testJob.id}`)
      .send({
        title: "updated job"
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toBe(401);
  });

  test("unauth for anon", async () => {
    const resp = await request(app)
      .patch(`/jobs/${testJob.id}`)
      .send({
        title: "updated job"
      })
    expect(resp.statusCode).toBe(401);
  });

  test("not found on no such job", async function () {
    const resp = await request(app)
        .patch(`/jobs/4940495`)
        .send({
          title: "new nope",
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on id change attempt", async function () {
    const resp = await request(app)
        .patch(`/jobs/${testJob.id}`)
        .send({
          id: 4940495
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toBe(400);
  });

  test("bad request on invalid data", async function () {
    const resp = await request(app)
        .patch(`/jobs/${testJob.id}`)
        .send({
          salary: "not-a-num",
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", () => {
  test("works for admins", async () => {
    const resp = await request(app)
      .delete(`/jobs/${testJob.id}`)
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.body).toEqual({deleted: `Job with id of ${testJob.id}`});
  });

  test("unauth for users", async () => {
    const resp = await request(app)
      .delete(`/jobs/${testJob.id}`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toBe(401);
  });

  test("unauth for anon", async () => {
    const resp = await request(app)
      .delete(`/jobs/${testJob.id}`);
    expect(resp.statusCode).toBe(401);
  });

  test("not found for no such company", async function () {
    const resp = await request(app)
        .delete(`/jobs/4940495`)
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});