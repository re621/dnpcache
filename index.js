const fs = require('fs');
if (!fs.existsSync("data.json"))
    fs.writeFileSync("data.json", JSON.stringify({ version: 0, from: 0, data: [] }));

const Zesty = require("@re621/zestyapi");
const E621 = Zesty.connect({
    userAgent: "re621/dnpcache",
    rateLimit: 1000,
});

(async () => {

    // Fetch new data
    const newData = [];
    let response, page = 1;
    do {
        response = await E621.TagImplications.find({ consequent_name: ["avoid_posting", "conditional_dnp"], limit: 320, page: page });
        for (alias of response.data)
            newData.push(alias.antecedent_name);
        page++;
    } while (response.status.code == 200 && response.data.length == 320);

    // Fetch old data
    const oldFile = JSON.parse(fs.readFileSync("data.json"))
    let oldData = oldFile.data;
    console.log("old", oldData.length);

    // Find the difference
    const added = newData.filter(n => !oldData.includes(n)),
        removed = oldData.filter(n => !newData.includes(n));

    console.log("added: " + added.length, "removed: " + removed.length);

    if (added.length == 0 && removed.length == 0) return;
    const version = oldFile.version + 1;
    fs.writeFileSync("data.json", JSON.stringify({
        version: version,
        from: (new Date()).getTime(),
        data: newData
    }, null, 2));

    // Commit to git
    const simpleGit = require('simple-git');
    const git = simpleGit();
    await git.add("data.json");
    await git.addConfig("user.name", "bitWolfy");
    await git.addConfig("user.email", "anon.wolfy@pm.me");

    // Generate the commit name
    let message = "";
    if (added.length > 0) {
        if (removed.length > 0)
            message = `Add ${added.length} and remove ${removed.length} artist${removed.length > 1 ? "s" : ""} from the DNP list.`
        else {
            if (added.length > 2) message = `Add ${added.length} artists to the DNP list.`;
            else if (added.length == 2) message = `Add ${added[0]} and ${added[1]} to the DNP list.`;
            else message = `Add ${added[0]} to the DNP list.`
        }
    } else {
        if (removed.length > 2) message = `Remove ${removed.length} artists from the DNP list.`;
        else if (removed.length == 2) message = `Remove ${removed[0]} and ${removed[1]} from the DNP list.`;
        else message = `Remove ${removed[0]} from the DNP list.`
    }

    await git.commit([message]);
    await git.addTag("" + version);
    await git.push();
    await git.push(["--tags"]);
})();
