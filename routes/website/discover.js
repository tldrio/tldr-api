var config = require('../../lib/config')

module.exports = function (req, res, next) {
  var partials = req.renderingPartials || {}
    , values = req.renderingValues || {}
    ;

  values.title = "discover" + config.titles.branding + config.titles.shortDescription;
  values.description = "Private scratchpad to test stuff.";
  partials.content = '{{>website/pages/discover}}';
  values.tldr = { hostname: 'biatch.com'
                , creator: { username: 'chloe' }
                , topics: ['programming']
                , imageUrl: 'http://www.alternet.org/files/story_images/screen_shot_2013-02-25_at_12.51.40_pm.png'
                , title: '9 Fascinating Things You May Not Know About the Penis'
                , hostname: 'alternet.org'
                , readCount: 5687
                , tyCount: 345
                , summaryBullets: [ 'Lots of animals, including the chimpanzees, still have spines on their penis and a penis bone that keeps it rigid. Humans have neither of these.'
                                  , 'The third arm of the male argonaut octopus is a detachable penis and the male priapiumfish has reproductive organs hanging from his chin.'
                                  , 'Smoking may cause damage to penile tissue, making it less elastic and preventing it from stretching. And w/o regular erections, your penis can shrink!'
                                  , 'Elephant penises are referred to as “prehensile,” which means they can grasp and hold things with their penis.'
                                  , 'Foreskin, the retractable piece of skin that covers the penis, has been used in a lab to grow artificial skin cells for burn victims.'
                                  ]
                };

  res.render('website/responsiveLayout', { values: values
                                    , partials: partials
                                    });
}
