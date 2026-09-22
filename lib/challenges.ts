export const challenges = [
{id:'queue',number:'01',type:'غيّر القاعدة',category:'الحياة اليومية',title:'الانتظار… بس بطريقة ثانية.',short:'طابور طويل، وناس مستعجلة. كيف تغيّر التجربة؟',description:'تخيّل مطعمًا صغيرًا وقت الزحمة. الزبائن ينتظرون طلباتهم، وما يعرفون متى يجي دورهم. كيف تخلي الانتظار أقل إزعاجًا بدون موظفين إضافيين أو تطبيق جديد؟',twist:'طيب، لو لازم فكرتك تشتغل حتى لو الزبون ما معه جوال؟',hint:'فكّر في اللي يصير أثناء الانتظار، مو بس كيف تقصّر الطابور.',icon:'shuffle',color:'purple'},
{id:'reverse',number:'02',type:'اقلب الفكرة',category:'التجارب الرقمية',title:'أسوأ تجربة… تصير أفضل فكرة.',short:'صمّم أسوأ طريقة لإلغاء اشتراك، وبعدين اعكسها.',description:'تخيّل خدمة تخلي إلغاء الاشتراك أصعب مهمة في يومك. اذكر شيئين يخلّون التجربة سيئة، وبعدين اقلبهم إلى فكرة تجعل الإلغاء واضحًا وسهلًا.',twist:'لو المستخدم يجرب الإنترنت لأول مرة؟',hint:'ابدأ بالشيء المزعج. أحيانًا هذا أسهل طريق للحل.',icon:'flip',color:'mint'},
{id:'alone',number:'03',type:'ماذا لو؟',category:'المجتمع',title:'جاي لحالك؟ مكانك موجود.',short:'فعالية ممتعة حتى للي ما يعرف أحد.',description:'شخص وصل لفعالية وكل الموجودين يعرفون بعض. ابتكر نشاطًا بسيطًا يخليه يشارك براحة، بدون ما يعرّف بنفسه أمام الجميع. خلك على شيء ما يحتاج ميزانية.',twist:'لو بعض الحضور يفضلون يشاركون بدون كلام؟',hint:'فكّر في أول خمس دقائق من وصوله.',icon:'people',color:'peach'},
] as const;
export type Challenge=typeof challenges[number];
export type Comment={id:string;name:string;body:string;created_at:string;isOwn:boolean};
export type Idea={id:string;challenge_id:string;name:string;title:string;body:string;created_at:string;isOwn:boolean;likes:number;liked:boolean;comments:Comment[]};
export type AppData={signedIn:boolean;ideas:Idea[];progress:{xp:number;ideas:number;reviews:number}};
