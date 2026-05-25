'use client'
import { Navigation } from 'lucide-react'

import { socialMedia } from '@/data'
import MagicButton from '@/components/ui/MagicButton'

const Footer = () => {
  return (
    <footer className="section relative" id="contact">
      <div className="container">
        {/* background grid */}
        <div className="w-full h-full absolute left-0 bottom-0">
          <img
            src="/images/footer-grid.svg"
            alt="grid"
            className="w-full h-full"
          />
        </div>

        <div className="flex flex-col items-center">
          <h1 className="text-6xl font-bold text-center lg:max-w-[45vw]">
            Sẵn sàng nâng cấp <span className="text-primary">thương hiệu</span>{' '}
            của bạn?
          </h1>
          <p className="text-muted-foreground md:mt-10 my-5 text-center">
            Liên hệ ngay để thảo luận về cách tôi có thể giúp bạn đạt được mục
            tiêu!
          </p>
          <a href="mailto:huyvu.antng@gmail.com">
            <MagicButton
              title="Kết nối ngay"
              icon={<Navigation />}
              position="right"
            />
          </a>
        </div>
        <div className="flex mt-16 md:flex-row flex-col justify-between items-center">
          <p className="md:text-base text-sm md:font-normal font-light">
            {/* Copyright © 2025 */}
          </p>

          <div className="flex items-center md:gap-3 gap-6">
            {socialMedia.map((info) => (
              <div
                key={info.id}
                className="w-10 h-10 cursor-pointer flex justify-center items-center backdrop-filter backdrop-blur-lg saturate-180 bg-opacity-75 bg-black-200 rounded-lg border border-black-300"
              >
                <a href={info.link} target="_blank" rel="noopener noreferrer">
                  <info.icon
                    className="text-white-200 hover:text-purple transition-all duration-300"
                    size={20}
                  />
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
