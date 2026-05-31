'use client'

import React from 'react'

interface ProjectMediaIframesProps {
  iframeLink: string | null
  youtubeLink: string | null
}

export function ProjectMediaIframes({
  iframeLink,
  youtubeLink,
}: ProjectMediaIframesProps) {
  return (
    <>
      {/* Dashboard Iframe */}
      {iframeLink && (
        <div id="dashboard-iframe" className="border p-4 rounded relative">
          <h3 className="text-lg font-semibold mb-2 absolute top-4 left-4">
            Dashboard
          </h3>
          <iframe
            src={iframeLink}
            width="100%"
            height="500px"
            title="Dashboard"
            className="rounded mt-8"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      )}

      {/* YouTube Iframe */}
      {youtubeLink && (
        <div id="youtube-iframe" className="border p-4 rounded relative">
          <h3 className="text-lg font-semibold mb-2 absolute top-4 left-4">
            Video
          </h3>
          <iframe
            src={youtubeLink}
            width="100%"
            height="500px"
            title="Video YouTube"
            className="rounded mt-8"
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        </div>
      )}
    </>
  )
}
