from torchvision import transforms
from PIL import Image
from torch.utils.tensorboard import SummaryWriter
#tensor数据类型
#通过Transform.Totensor研究两个问题
#transform该如何使用
#为什么我们需要Tensor数据类型
writer = SummaryWriter('logs')
img_path = 'data/train/ants_image/0013035.jpg'

img = Image.open(img_path)

# print(type(img))

tensor_trans = transforms.ToTensor()

tensor_img = tensor_trans(img)
writer.add_image('Tensor_img', tensor_img,global_step=1)

writer.close()
# print(type(tensor_img))
