(function (factory) {
  if (typeof define === "function" && define.amd) {
    define(["jquery"], factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = function (root, jQuery) {
      if (jQuery === undefined) {
        if (typeof window !== "undefined") {
          jQuery = require("jquery");
        } else {
          jQuery = require("jquery")(root);
        }
      }
      factory(jQuery);
      return jQuery;
    };
  } else {
    factory(jQuery);
  }
})(function ($) {
  $.fn.tilt = function (options) {
    const requestTick = function () {
      if (this.ticking) return;
      requestAnimationFrame(updateTransforms.bind(this));
      this.ticking = true;
    };

    const bindEvents = function () {
      const _this = this;
      $(this).on("mousemove", mouseMove);
      $(this).on("mouseenter", mouseEnter);
      if (this.settings.reset) $(this).on("mouseleave", mouseLeave);
      if (this.settings.glare)
        $(window).on("resize", updateGlareSize.bind(_this));
    };

    const setTransition = function () {
      if (this.timeout !== undefined) clearTimeout(this.timeout);
      $(this).css({
        transition: `${this.settings.speed}ms ${this.settings.easing}`,
      });
      if (this.settings.glare)
        this.glareElement.css({
          transition: `opacity ${this.settings.speed}ms ${this.settings.easing}`,
        });
      this.timeout = setTimeout(() => {
        $(this).css({ transition: "" });
        if (this.settings.glare) this.glareElement.css({ transition: "" });
      }, this.settings.speed);
    };

    const mouseEnter = function (event) {
      this.ticking = false;
      $(this).css({ "will-change": "transform" });
      setTransition.call(this);

      $(this).trigger("tilt.mouseEnter");
    };

    /**
     * Return the x,y position of the mouse on the tilt element
     * @returns {{x: *, y: *}}
     */
    const getMousePositions = function (event) {
      if (typeof event === "undefined") {
        event = {
          pageX: $(this).offset().left + $(this).outerWidth() / 2,
          pageY: $(this).offset().top + $(this).outerHeight() / 2,
        };
      }
      return { x: event.pageX, y: event.pageY };
    };

    const mouseMove = function (event) {
      this.mousePositions = getMousePositions(event);
      requestTick.call(this);
    };

    const mouseLeave = function () {
      setTransition.call(this);
      this.reset = true;
      requestTick.call(this);

      // Trigger change event
      $(this).trigger("tilt.mouseLeave");
    };

    /**
     * Get tilt values
     *
     * @returns {{x: tilt value, y: tilt value}}
     */
    const getValues = function () {
      const width = $(this).outerWidth();
      const height = $(this).outerHeight();
      const left = $(this).offset().left;
      const top = $(this).offset().top;
      const percentageX = (this.mousePositions.x - left) / width;
      const percentageY = (this.mousePositions.y - top) / height;
      // x or y position inside instance / width of instance = percentage of position inside instance * the max tilt value
      const tiltX = (
        this.settings.maxTilt / 2 -
        percentageX * this.settings.maxTilt
      ).toFixed(2);
      const tiltY = (
        percentageY * this.settings.maxTilt -
        this.settings.maxTilt / 2
      ).toFixed(2);
      // angle
      const angle =
        Math.atan2(
          this.mousePositions.x - (left + width / 2),
          -(this.mousePositions.y - (top + height / 2))
        ) *
        (180 / Math.PI);
      // Return x & y tilt values
      return {
        tiltX,
        tiltY,
        percentageX: percentageX * 100,
        percentageY: percentageY * 100,
        angle,
      };
    };

    const updateTransforms = function () {
      this.transforms = getValues.call(this);

      if (this.reset) {
        this.reset = false;
        $(this).css(
          "transform",
          `perspective(${this.settings.perspective}px) rotateX(0deg) rotateY(0deg)`
        );

        if (this.settings.glare) {
          this.glareElement.css(
            "transform",
            `rotate(180deg) translate(-50%, -50%)`
          );
          this.glareElement.css("opacity", `0`);
        }

        return;
      } else {
        $(this).css(
          "transform",
          `perspective(${this.settings.perspective}px) rotateX(${
            this.settings.axis === "x" ? 0 : this.transforms.tiltY
          }deg) rotateY(${
            this.settings.axis === "y" ? 0 : this.transforms.tiltX
          }deg) scale3d(${this.settings.scale},${this.settings.scale},${
            this.settings.scale
          })`
        );

        if (this.settings.glare) {
          this.glareElement.css(
            "transform",
            `rotate(${this.transforms.angle}deg) translate(-50%, -50%)`
          );
          this.glareElement.css(
            "opacity",
            `${(this.transforms.percentageY * this.settings.maxGlare) / 100}`
          );
        }
      }

      $(this).trigger("change", [this.transforms]);

      this.ticking = false;
    };

    const prepareGlare = function () {
      const glarePrerender = this.settings.glarePrerender;

      if (!glarePrerender)
        $(this).append(
          '<div class="js-tilt-glare"><div class="js-tilt-glare-inner"></div></div>'
        );

      this.glareElementWrapper = $(this).find(".js-tilt-glare");
      this.glareElement = $(this).find(".js-tilt-glare-inner");

      if (glarePrerender) return;

      const stretch = {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
      };

      this.glareElementWrapper.css(stretch).css({
        overflow: "hidden",
      });

      this.glareElement.css({
        position: "absolute",
        top: "50%",
        left: "50%",
        "pointer-events": "none",
        "background-image": `linear-gradient(0deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%)`,
        width: `${$(this).outerWidth() * 2}`,
        height: `${$(this).outerWidth() * 2}`,
        transform: "rotate(180deg) translate(-50%, -50%)",
        "transform-origin": "0% 0%",
        opacity: "0",
      });
    };

    const updateGlareSize = function () {
      this.glareElement.css({
        width: `${$(this).outerWidth() * 2}`,
        height: `${$(this).outerWidth() * 2}`,
      });
    };

    $.fn.tilt.destroy = function () {
      $(this).each(function () {
        $(this).find(".js-tilt-glare").remove();
        $(this).css({ "will-change": "", transform: "" });
        $(this).off("mousemove mouseenter mouseleave");
      });
    };

    $.fn.tilt.getValues = function () {
      const results = [];
      $(this).each(function () {
        this.mousePositions = getMousePositions.call(this);
        results.push(getValues.call(this));
      });
      return results;
    };

    $.fn.tilt.reset = function () {
      $(this).each(function () {
        this.mousePositions = getMousePositions.call(this);
        this.settings = $(this).data("settings");
        mouseLeave.call(this);
        setTimeout(() => {
          this.reset = false;
        }, this.settings.transition);
      });
    };

    return this.each(function () {
      /**
       * Default settings merged with user settings
       * Can be set trough data attributes or as parameter.
       * @type {*}
       */
      this.settings = $.extend(
        {
          maxTilt: $(this).is("[data-tilt-max]")
            ? $(this).data("tilt-max")
            : 20,
          perspective: $(this).is("[data-tilt-perspective]")
            ? $(this).data("tilt-perspective")
            : 300,
          easing: $(this).is("[data-tilt-easing]")
            ? $(this).data("tilt-easing")
            : "cubic-bezier(.03,.98,.52,.99)",
          scale: $(this).is("[data-tilt-scale]")
            ? $(this).data("tilt-scale")
            : "1",
          speed: $(this).is("[data-tilt-speed]")
            ? $(this).data("tilt-speed")
            : "400",
          transition: $(this).is("[data-tilt-transition]")
            ? $(this).data("tilt-transition")
            : true,
          axis: $(this).is("[data-tilt-axis]")
            ? $(this).data("tilt-axis")
            : null,
          reset: $(this).is("[data-tilt-reset]")
            ? $(this).data("tilt-reset")
            : true,
          glare: $(this).is("[data-tilt-glare]")
            ? $(this).data("tilt-glare")
            : false,
          maxGlare: $(this).is("[data-tilt-maxglare]")
            ? $(this).data("tilt-maxglare")
            : 1,
        },
        options
      );

      this.init = () => {
        $(this).data("settings", this.settings);

        if (this.settings.glare) prepareGlare.call(this);

        bindEvents.call(this);
      };

      this.init();
    });
  };

  $("[data-tilt]").tilt();

  return true;
});

$(".card").tilt({
  glare: true,
  maxGlare: 0.2,
  maxTilt: 5,
});

// video

let progress = 100;
let active = false;
let complete = false;
const trigger = $(".trigger");
const offScreen = $(".offscreen");
const content = offScreen.find(".content");
const closeBtn = offScreen.find(".close");

trigger.on("click", function () {
  active = true;
  start();
});

trigger.on("click", finish);

// reset

closeBtn.on("click", reset);

function reset() {
  active = false;
  complete = false;
  progress = 100;
  transition(100);
  offScreen.removeClass("open");
}

function start() {
  if (active && !complete) {
    if (progress <= 30) {
      progress = 0;
      complete = true;
      offScreen.addClass("open");
    } else {
      progress = progress - 1;
      setTimeout(start, 10);
    }
    console.log(`progress: ${progress}`);
    transition(progress);
  }
}

function stop() {
  if (!complete) {
    progress = 100;
    transition(100);
    offScreen.removeClass("open");
  }
}

function finish() {
  progress = 0;
  complete = true;
  transition(progress);
  offScreen.addClass("open");
}

function transition(progress) {
  TweenMax.to(offScreen, 0.6, {
    x: `${progress}vw`,
  });
  TweenMax.to(content, 0.6, {
    x: `-${progress}vw`,
  });
}

transition(0);
setTimeout(function () {
  transition(100);
}, 1000);

// end video
