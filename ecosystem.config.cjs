module.exports = {
  apps: [
    {
      name: "teaching-os-ste",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "dev -H 0.0.0.0 -p 3000",
      env: {
        NODE_ENV: "development",
      },
    },
  ],
};
