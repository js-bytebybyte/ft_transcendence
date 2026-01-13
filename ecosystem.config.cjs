const prod = process.env.NODE_ENV === "production";
const dev  = process.env.NODE_ENV === "development";

const apps = [];

apps.push({
  name: "Backend",
  cwd: prod ? "." : "src/backend",
  script: prod ? "dist/server.js" : "server.ts",
  interpreter: prod ? "node" : "tsx",
  watch: dev,
  ignore_watch: [
    "db/*.sqlite",
    "db/*.sqlite-journal",
    "db/*.sqlite-wal",
    "db/*.sqlite-shm", 
    "src/Routes/uploads/*"
  ],
  env: { PORT: 3000 }
});

if (dev) {
  apps.push({
    name: "Frontend",
    cwd: "src/frontend",
    script: "npx",
    interpreter: "node",
    args: ["vite", "--host", "0.0.0.0"],
    env: { PORT: 3001 }
  });

  apps.push({
    name: "Tailwind",
    script: "npx",
    args: [
      "tailwindcss",
      "--input",  "./src/frontend/src/styles/input.css",
      "--output", "./src/frontend/src/styles/output.css",
      "--watch"
    ]
  });
} else if (prod) {
  apps.push({
    name: "Frontend",
    cwd: ".",
    script: "dist/frontend/server.js",
    interpreter: "node",
    env: { PORT: 3001 }
  })
}

module.exports = { apps };
