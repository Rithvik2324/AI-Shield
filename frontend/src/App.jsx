import React, {useState} from 'react'
import RedactionResult from './components/RedactionResult'
import sdk from './sdk/aiShieldSdk'


export default function App(){
const [text, setText] = useState('')
const [result, setResult] = useState(null)
const [response, setResponse] = useState(null)


async function handleProcess(){
const res = await sdk.processText(text)
setResult(res)
}


async function handleAsk(){
if(!result) return
const sanitized = result.redacted
const r = await sdk.askLLM(sanitized)
setResponse(r)
}


return (
<div className="p-6 max-w-3xl mx-auto">
<h1 className="text-2xl font-bold mb-4">TechnoSleuths — AIShield Demo</h1>
<textarea className="w-full h-36 p-2 border rounded" value={text} onChange={e=>setText(e.target.value)} placeholder="Paste text with PII here"></textarea>
<div className="flex gap-2 mt-3">
<button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleProcess}>Process</button>
<button className="px-4 py-2 bg-green-600 text-white rounded" onClick={handleAsk}>Ask LLM</button>
</div>


{result && <RedactionResult result={result} />}


{response && (
<div className="mt-4 p-3 border rounded">
<h3 className="font-semibold">LLM Response</h3>
<pre className="whitespace-pre-wrap">{JSON.stringify(response, null, 2)}</pre>
</div>
)}
</div>
)
}