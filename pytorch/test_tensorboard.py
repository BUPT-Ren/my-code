from torch.utils.tensorboard import SummaryWriter
import os
from PIL import Image
import numpy as np
image_path = 'data/train/bees_image/17209602_fe5a5a746f.jpg'
writer = SummaryWriter('logs')
img_PIL = Image.open(image_path) #不满足 add_image参数格式
img_array = np.array(img_PIL)    #满足  但要用dataformats转换
print(type(img_array))  #H,W,C
print(img_array.shape)
writer.add_image('test_蜜蜂_1', img_array, 2,dataformats='HWC')
writer.close()
#y=x
# for i in range(100):
#
#     writer.add_scalar('y=2x',2*i,i)
#
# writer.close()
# print(os.listdir('logs'))