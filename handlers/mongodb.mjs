const REGION = 'data' // or pin to a region with e.g. 'us-east-1'
const URL_PREFIX = `https://${REGION}.mongodb-api.com/app`
const URL_SUFFIX = 'endpoint/data/v1/action'

export async function dataApi(collection, action, query = {}, ejson = false) {
	const apiKey = process.env.MONGODB_API_KEY
	const apiId = process.env.MONGODB_API_ID
	const url = `${URL_PREFIX}/${apiId}/${URL_SUFFIX}/${action}`

    let requestBody = {
        dataSource: process.env.MONGODB_DATA_SOURCE,
        database: processs.env.MONGODB_DATABASE,
        collection
    }

	//Merge the actual query with the base MongoDB variables
    Object.assign(requestBody, query)

	let response = await fetch(url, {
        method: "POST",
		headers: {
			'Content-Type': 'application/json',
			'Accept': ejson ? 'application/ejson' : 'application/json',
			'Access-Control-Request-Headers': '*',
			'api-key': apiKey,
		},
		body: JSON.stringify(requestBody)
	})

    return response.json()
}