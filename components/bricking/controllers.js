const { getBrickWithExternalProvidersFallbackAsync } = require("./utils");
const logger = $$.getLogger("apihub", "bricking");

async function getBrick(request, response) {
    response.setHeader("content-type", "application/octet-stream");
    response.setHeader("Cache-control", "max-age=31536000"); // set brick cache to expire in 1 year

    const {domain, hashLink} = request.params;
    try {
        const brick = await getBrickWithExternalProvidersFallbackAsync(request, domain, hashLink, request.fsBrickStorage);
        response.write(brick);
        return response.send(200);
    } catch (error) {
        logger.info(0x02, `Brick <${hashLink}> was not found`);
        return response.send(404, "Brick not found");
    }
}

function putBrick(request, response) {
    const utils = require("./utils");
    utils.convertReadableStreamToBuffer(request, (error, brickData) => {
        if (error) {
            logger.info(0x02, `Fail to convert Stream to Buffer!`, error.message);
            logger.error("Fail to convert Stream to Buffer!", error.message);
            return response.send(500);
        }

        request.fsBrickStorage.addBrick(brickData, (error, brickHash) => {
            if (error) {
                logger.info(0x02, `Fail to manage current brick!`, error.message);
                return response.send(error.code === "EACCES" ? 409 : 500);
            }

            return response.send(201, brickHash);
        });
    });
}

function downloadMultipleBricks(request, response) {
    response.setHeader("content-type", "application/octet-stream");
    response.setHeader("Cache-control", "max-age=31536000"); // set brick cache to expire in 1 year

    const { domain } = request.params;
    let { hashes } = request.query;

    if (!Array.isArray(hashes)) {
        hashes = [hashes];
    }

    const responses = hashes.map((hash) =>
        getBrickWithExternalProvidersFallbackAsync(request, domain, hash, request.fsBrickStorage)
    );
    Promise.all(responses)
        .then((bricks) => {
            const data = bricks.map((brick) => brick.toString());
            return response.send(200, data);
        })
        .catch((error) => {
            logger.info(0x02, `Fail to get multiple bricks`, error.message);
            return response.send(500);
        });
}

module.exports = {
    getBrick,
    putBrick,
    downloadMultipleBricks,
};
