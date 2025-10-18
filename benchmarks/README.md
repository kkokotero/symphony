# Synphony Benchmarks

This document presents a performance evaluation comparing **Synphony** against other popular Node.js frameworks.
The goal is to determine the **relative performance**, **efficiency under load**, and **average latency** of Synphony compared to established alternatives such as **Fastify**, **Koa**, **Hono**, and **Express**.

---

## Environment Setup

| Parameter                  | Value                                                |
| -------------------------- | ---------------------------------------------------- |
| **Node.js**                | `v22.17.0`                                           |
| **Concurrent Connections** | 100                                                  |
| **Benchmark Duration**     | 10 seconds                                           |
| **Tested Endpoint**        | `/`                                                  |
| **Expected Response**      | `"ok"`                                               |
| **Tool Used**              | [Autocannon](https://github.com/mcollina/autocannon) |

---

## Detailed Results

Each test was run in an isolated server instance under identical conditions.
Below are the consolidated average results from four consecutive runs.

### Consolidated Averages

| Framework    | Avg RPS      | Peak RPS   | Avg Latency | Max Latency | Throughput    | Total Requests | Errors | Timeouts |
| ------------ | ------------ | ---------- | ----------- | ----------- | ------------- | -------------- | ------ | -------- |
| **Synphony** | **18,581.4** | **22,945** | **5.08 ms** | **392 ms**  | **2.22 MB/s** | **183,289**    | 0      | 0        |
| Fastify      | 17,828.1     | 21,113     | 5.23 ms     | 623 ms      | 2.74 MB/s     | 177,379        | 0      | 0        |
| Hono         | 12,936.6     | 15,249     | 7.25 ms     | 770 ms      | 2.27 MB/s     | 129,349        | 0      | 0        |
| Koa          | 12,692.6     | 14,354     | 7.63 ms     | 1200 ms     | 1.92 MB/s     | 121,915        | 0      | 0        |
| Express      | 4,552.7      | 5,312      | 21.99 ms    | 1518 ms     | 0.99 MB/s     | 47,781         | 0      | 0        |

---

## Comparative Analysis

### Requests per Second (RPS)

* **Synphony** achieves an average of **18,581 RPS**, outperforming **Fastify** by **4.2%**, and nearly doubling the performance of **Koa** and **Hono**.
* Compared to **Express**, Synphony delivers **4× higher throughput**, with an absolute difference of over **14,000 RPS**.

| Framework | Difference vs Synphony |
| --------- | ---------------------- |
| Fastify   | −4.2%                  |
| Hono      | −30.3%                 |
| Koa       | −31.7%                 |
| Express   | −75.5%                 |

---

### Average Latency

* Synphony shows an **average latency of 5.08 ms**, which is **3% lower** than Fastify and between **30–35% lower** than Hono and Koa.
* Under high concurrency, this translates to more consistent response times and lower jitter.

| Framework    | Avg Latency | Difference vs Synphony |
| ------------ | ----------- | ---------------------- |
| **Synphony** | **5.08 ms** | —                      |
| Fastify      | 5.23 ms     | +3.0%                  |
| Hono         | 7.25 ms     | +42.7%                 |
| Koa          | 7.63 ms     | +50.2%                 |
| Express      | 21.99 ms    | +333%                  |

---

### Throughput and Efficiency

Throughput measures the total data transferred per second.
While Fastify maintains a slightly higher raw throughput (2.74 MB/s), **Synphony achieves greater efficiency per time unit**, delivering more responses with lower latency.

| Framework    | Throughput | Efficiency (RPS/MB)    |
| ------------ | ---------- | ---------------------- |
| **Synphony** | 2.22 MB/s  | **8,371 RPS per MB/s** |
| Fastify      | 2.74 MB/s  | 6,507 RPS per MB/s     |
| Hono         | 2.27 MB/s  | 5,700 RPS per MB/s     |
| Koa          | 1.92 MB/s  | 6,611 RPS per MB/s     |
| Express      | 0.99 MB/s  | 4,598 RPS per MB/s     |

**Interpretation:**
Synphony offers the **highest performance density** (RPS per MB transferred), reflecting better resource utilization and lower overhead per connection.

---

## Run-to-Run Consistency

| Metric             | Std. Deviation (4 runs) | Coefficient of Variation |
| ------------------ | ----------------------- | ------------------------ |
| **Synphony (RPS)** | 1,330.4                 | **7.1%**                 |
| Fastify (RPS)      | 1,042.3                 | 5.8%                     |
| Koa (RPS)          | 2,908.4                 | 22.9%                    |
| Hono (RPS)         | 1,011.8                 | 7.8%                     |
| Express (RPS)      | 343.9                   | 7.5%                     |

**Observation:**
Synphony maintains variability under **8%**, demonstrating stable performance across multiple identical runs.
Frameworks like Koa show much higher dispersion (over **20%**), indicating fluctuating performance.

---

## Final Summary

| Metric                | Synphony     | Fastify  | Difference |
| --------------------- | ------------ | -------- | ---------- |
| **Avg RPS**           | **18,581.4** | 17,828.1 | **+4.2%**  |
| **Avg Latency**       | **5.08 ms**  | 5.23 ms  | **−3.0%**  |
| **RPS / MB**          | **8,371**    | 6,507    | **+28.6%** |
| **Errors / Timeouts** | 0            | 0        | —          |
