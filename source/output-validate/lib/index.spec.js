let expect = require('chai').expect;
var path = require('path');
let AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

let lambda = require('../index.js');

describe('#OUTPUT VALIDATE::', () => {

  let _events = require('./test-events.js')

  let _error = {
      "detail": {
          "jobId": "43d7kt",
          "status": "COMPLETE",
          "userMetadata": {
              "workflow": "voodoo",
              "guid": "9ccbbd94-e39c-4d9b-8f89-85fa1fc81fb4"
          },
          "outputGroupDetails":[]
      }
  };

  let data = {
    Item: {
      guid: "1234",
      cloudFront: 'cloudfront'
    }
  }

  process.env.ErrorHandler = 'error_handler';

  afterEach(() => {
    AWS.restore('DynamoDB.DocumentClient');
  });

  it('should return "SUCCESS" on parsing CMAF MSS output', async () => {

    AWS.mock('DynamoDB.DocumentClient', 'get', Promise.resolve(data));

    let response = await lambda.handler(_events.cmafMss)
    expect(response.mssPlaylist).to.equal('s3://voodoo-destination-1w8dqfz7w8cq3/12345/mss/big_bunny.ism');
    expect(response.mssUrl).to.equal('https://cloudfront/12345/mss/big_bunny.ism');
    expect(response.cmafDashPlaylist).to.equal('s3://voodoo-destination-1w8dqfz7w8cq3/12345/cmaf/big_bunny.mpd');
    expect(response.cmafDashUrl).to.equal('https://cloudfront/12345/cmaf/big_bunny.mpd');
  });

  it('should return "SUCCESS" on parsing HLS DASH output', async () => {

    AWS.mock('DynamoDB.DocumentClient', 'get', Promise.resolve(data));

    let response = await lambda.handler(_events.hlsDash)
    expect(response.hlsPlaylist).to.equal('s3://vod4-destination-fr0ao9hz7tbo/12345/hls/dude.m3u8');
    expect(response.hlsUrl).to.equal('https://cloudfront/12345/hls/dude.m3u8');
    expect(response.dashPlaylist).to.equal('s3://vod4-destination-fr0ao9hz7tbo/12345/dash/dude.mpd');
    expect(response.dashUrl).to.equal('https://cloudfront/12345/dash/dude.mpd');
  });

  it('should return "SUCCESS" on parsing MP4 output', async () => {

    AWS.mock('DynamoDB.DocumentClient', 'get', Promise.resolve(data));

    let response = await lambda.handler(_events.mp4)
    expect(response.mp4Outputs[0]).to.equal('s3://vod4-destination-fr0ao9hz7tbo/12345/mp4/dude_3.0Mbps.mp4');
    expect(response.mp4Urls[0]).to.equal('https://cloudfront/12345/mp4/dude_3.0Mbps.mp4');
  });

  it('should return "DB ERROR" when db get fails', async () => {
    AWS.mock('DynamoDB.DocumentClient', 'get', Promise.reject('DB ERROR'));
    AWS.mock('Lambda', 'invoke', Promise.resolve());

    await lambda.handler(_events.cmafMss).catch(err => {
      expect(err).to.equal('DB ERROR');
    });
  });

  it('should return "ERROR" when output parse fails', async () => {
    AWS.mock('DynamoDB.DocumentClient', 'get', Promise.resolve(data));

    await lambda.handler(_error).catch(err => {
      expect(err.toString()).to.equal('Could not parse MediaConvert Output');
    });
  });

});
