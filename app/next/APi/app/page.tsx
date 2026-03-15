'use client'
import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function Home() {
  const [id, setId] = useState("1")
  const [post, setPost] = useState<any>(null)

  async function getData() {
    const res = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`)
    setPost(await res.json())
  }

  return (
    <>
      <h1>API</h1>
      <input
        type="text"
        onChange={(e) => setId(e.target.value)}
        className="text-black border"
      />
      <Button variant="outline" onClick={getData}>GET</Button>
      {post && <pre>{JSON.stringify(post, null, 2)}</pre>}
    </>
  )
}